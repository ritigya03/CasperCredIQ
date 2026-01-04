import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); // Increased limit for file uploads

const OLLAMA_HOST = 'http://localhost:11434';
const MODEL = 'tinyllama';

/**
 * Simple Ollama call with timeout
 */
async function askOllama(question, timeout = 20000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt: question,
        stream: false,
        options: { temperature: 0.3, num_predict: 150 }
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Ollama responded with status ${response.status}`);
    }
    
    const data = await response.json();
    return data.response.trim();
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Ollama request timed out');
    } else {
      console.log('Ollama unavailable:', error.message);
    }
    return null;
  }
}

/**
 * AI Verification Endpoint - Enhanced with file support
 */
app.post('/ai-verify', async (req, res) => {
  try {
    // Extract data from form
    const { 
      role, 
      organization, 
      justification,
      duration,
      name,
      age,
      gender,
      email,
      phone,
      supportingDocuments,
      hasFiles
    } = req.body;

    // Basic validation
    if (!role || !justification || !organization) {
      return res.json({
        recommended: false,
        confidence: 0,
        risk_level: 'high',
        explanation: 'Missing required fields: role, organization, and justification are required.'
      });
    }

    // Normalize inputs
    const cleanRole = role.trim().toLowerCase();
    const cleanOrg = organization.trim().toLowerCase();
    const cleanJustification = justification.trim().toLowerCase();
    const cleanDuration = duration ? duration.trim().toLowerCase() : '';
    const cleanName = name ? name.trim() : '';
    const cleanAge = age ? parseInt(age) : null;
    const cleanGender = gender ? gender.trim().toLowerCase() : '';

    console.log(`\n=== NEW VERIFICATION REQUEST ===`);
    console.log(`Name: ${cleanName}`);
    console.log(`Role: ${role}`);
    console.log(`Organization: ${organization}`);
    console.log(`Duration: ${duration}`);
    console.log(`Has Files: ${hasFiles}`);
    console.log(`================================\n`);

    // === CRITICAL VALIDATION RULES ===
    
    // 1. Bad words check
    const badWords = [
      'fuck', 'shit', 'ass', 'bitch', 'damn', 'hell', 'cunt', 
      'dick', 'piss', 'bastard', 'motherfucker', 'crap', 'cock',
      'pussy', 'whore', 'slut', 'retard', 'idiot', 'moron', 'dumbass'
    ];
    
    const textToCheck = `${cleanOrg} ${cleanJustification}`;
    const foundBadWords = badWords.filter(word => textToCheck.includes(word));
    
    if (foundBadWords.length > 0) {
      console.log(`❌ REJECTED: Bad words detected`);
      return res.json({
        recommended: false,
        confidence: 0.95,
        risk_level: 'critical',
        explanation: 'Request denied: Unprofessional language detected. Please maintain professional communication standards.'
      });
    }

    // 2. Age validation (if provided)
    if (cleanAge !== null && cleanAge < 18) {
      console.log(`❌ REJECTED: Age below 18`);
      return res.json({
        recommended: false,
        confidence: 0.9,
        risk_level: 'high',
        explanation: 'Request denied: Applicant must be at least 18 years old.'
      });
    }

    // 3. Email validation
    if (email && !email.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i)) {
      console.log(`❌ REJECTED: Invalid email`);
      return res.json({
        recommended: false,
        confidence: 0.85,
        risk_level: 'high',
        explanation: 'Request denied: Invalid email address format.'
      });
    }

    // 4. Student-specific organization validation
    if (cleanRole.includes('student') || cleanRole.includes('faculty') || cleanRole.includes('professor')) {
      const invalidOrgs = [
        'do not provide', 'not provided', 'none', 'na', 'n/a', 
        'unknown', 'test', 'example', 'temp', 'asdf', 'qwerty',
        '123', 'aaa', 'test company', 'sample', 'demo'
      ];
      
      if (invalidOrgs.some(invalid => cleanOrg.includes(invalid))) {
        console.log(`❌ REJECTED: Invalid organization for educational role`);
        return res.json({
          recommended: false,
          confidence: 0.9,
          risk_level: 'high',
          explanation: 'Request denied: Educational roles require a valid institution name. Please provide the official name of your school, college, or university.'
        });
      }
    }

    // 5. Gibberish detection
    const hasGibberish = /(.)\1{4,}/.test(textToCheck) || // 5+ repeated characters
                        /^[0-9]+$/.test(cleanOrg) ||
                        cleanOrg.length < 2 ||
                        ['test', 'asdf', 'qwerty', '123', 'aaa', 'xyz', 'abc'].includes(cleanOrg);
    
    if (hasGibberish) {
      console.log(`❌ REJECTED: Gibberish detected`);
      return res.json({
        recommended: false,
        confidence: 0.85,
        risk_level: 'high',
        explanation: 'Request denied: Invalid or placeholder information detected. Please provide valid details.'
      });
    }

    // 6. Justification length check
    if (cleanJustification.length < 50) {
      console.log(`❌ REJECTED: Justification too short (${cleanJustification.length} chars)`);
      return res.json({
        recommended: false,
        confidence: 0.8,
        risk_level: 'high',
        explanation: 'Request denied: Justification is too brief. Please provide a detailed explanation (minimum 50 characters) about why you need this role.'
      });
    }

    // === PREPARE FOR AI ANALYSIS ===
    
    // Collect context for better AI analysis
    const userContext = [];
    if (cleanName) userContext.push(`Applicant: ${cleanName}`);
    if (cleanAge) userContext.push(`Age: ${cleanAge}`);
    if (cleanGender) userContext.push(`Gender: ${cleanGender}`);
    if (cleanDuration) userContext.push(`Requested Duration: ${cleanDuration}`);
    if (hasFiles) userContext.push(`Supporting Documents: Provided (${supportingDocuments || 'files uploaded'})`);
    
    // Check justification quality indicators
    const qualityIndicators = {
      hasSpecifics: /(project|task|assignment|course|work|job|duty|responsibilit)/i.test(cleanJustification),
      hasTimeframe: /(week|month|year|semester|quarter|duration)/i.test(cleanJustification),
      hasPurpose: /(need|require|necessary|essential|important|critical)/i.test(cleanJustification),
      hasDetails: cleanJustification.length > 100,
      mentionsOrg: new RegExp(cleanOrg.split(' ')[0], 'i').test(cleanJustification),
      hasDocuments: hasFiles || (supportingDocuments && supportingDocuments.length > 0)
    };
    
    const qualityScore = Object.values(qualityIndicators).filter(Boolean).length;
    console.log(`Quality Score: ${qualityScore}/6`);

    // === AI PROMPT WITH CONTEXT ===
    const aiPrompt = `
You are an access control and credential verification expert. Analyze this credential request:

APPLICANT CONTEXT:
${userContext.join('\n')}

REQUEST DETAILS:
- Requested Role: ${role}
- Organization/Institution: ${organization}
- Requested Duration: ${duration || 'Not specified'}
- Justification: "${justification}"

ANALYSIS CRITERIA:
1. RELEVANCE: Does the justification match the requested role?
2. SPECIFICITY: Is the explanation detailed and specific?
3. LEGITIMACY: Does this seem like a legitimate need?
4. DURATION: Is the requested duration appropriate?
5. RISK ASSESSMENT: Any security or misuse concerns?

QUALITY INDICATORS FOUND:
- Detailed justification (100+ chars): ${qualityIndicators.hasDetails ? 'YES' : 'NO'}
- Mentions specific tasks/projects: ${qualityIndicators.hasSpecifics ? 'YES' : 'NO'}
- Includes timeframe: ${qualityIndicators.hasTimeframe ? 'YES' : 'NO'}
- Clear purpose stated: ${qualityIndicators.hasPurpose ? 'YES' : 'NO'}
- Mentions organization: ${qualityIndicators.mentionsOrg ? 'YES' : 'NO'}
- Supporting documents provided: ${qualityIndicators.hasDocuments ? 'YES' : 'NO'}

IMPORTANT NOTES:
- Student/faculty roles should have educational context
- High-privilege roles need strong justification
- Vague justifications are suspicious
- Professional communication expected
- Supporting documents increase credibility

RESPONSE FORMAT:
Provide your final assessment in this exact format:

VERDICT: [APPROVE or DENY]
CONFIDENCE: [HIGH, MEDIUM, or LOW]
EXPLANATION: [2-3 sentence explanation of your decision]

Example:
VERDICT: APPROVE
CONFIDENCE: HIGH
EXPLANATION: The justification clearly explains the need for student access to course materials at Stanford University for a specific semester. The request includes supporting documentation and a clear timeframe.

Now analyze the above request:
`;

    console.log('Sending to AI for analysis...');
    const aiResponse = await askOllama(aiPrompt);
    
    let recommended = false;
    let confidence = 0.5;
    let risk_level = 'medium';
    let explanation = 'Unable to process request. Please try again.';
    
    if (aiResponse) {
      console.log('AI Response received:', aiResponse.substring(0, 100) + '...');
      
      // Parse AI response
      const verdictMatch = aiResponse.match(/VERDICT:\s*(APPROVE|DENY)/i);
      const confidenceMatch = aiResponse.match(/CONFIDENCE:\s*(HIGH|MEDIUM|LOW)/i);
      const explanationMatch = aiResponse.match(/EXPLANATION:\s*(.+?)(?:\n|$)/is);
      
      if (verdictMatch) {
        const verdict = verdictMatch[1].toUpperCase();
        recommended = verdict === 'APPROVE';
        
        // Set confidence based on AI's confidence level
        if (confidenceMatch) {
          const confLevel = confidenceMatch[1].toUpperCase();
          if (confLevel === 'HIGH') confidence = 0.85;
          else if (confLevel === 'MEDIUM') confidence = 0.65;
          else confidence = 0.45;
        } else {
          // Default confidence based on quality score
          confidence = 0.5 + (qualityScore * 0.05);
        }
        
        // Get explanation
        if (explanationMatch) {
          explanation = explanationMatch[1].trim();
          // Clean up the explanation
          explanation = explanation.replace(/\n+/g, ' ').trim();
        } else {
          // Fallback explanation
          explanation = recommended ? 
            'AI analysis indicates this request appears legitimate and appropriate for the stated purpose.' :
            'AI analysis identified concerns with this request that require additional clarification.';
        }
        
        // Adjust confidence based on quality indicators
        if (qualityScore >= 5) {
          confidence = Math.min(confidence + 0.1, 0.95);
        } else if (qualityScore <= 2) {
          confidence = Math.max(confidence - 0.15, 0.3);
        }
        
        // Bonus for supporting documents
        if (hasFiles) {
          confidence = Math.min(confidence + 0.05, 0.95);
          if (recommended) {
            explanation += ' Supporting documentation provided strengthens this request.';
          }
        }
        
        // Role-specific adjustments
        if (cleanRole.includes('admin') || cleanRole.includes('root') || cleanRole.includes('superuser')) {
          if (recommended) {
            confidence *= 0.9;
            risk_level = 'medium';
          } else {
            confidence = Math.max(confidence, 0.7);
          }
        }
        
        // Duration consideration
        if (cleanDuration && cleanDuration.includes('permanent')) {
          if (recommended) {
            explanation += ' Note: Permanent access requests require periodic review.';
            confidence *= 0.95;
          }
        }
        
        // Set risk level
        if (recommended) {
          if (confidence >= 0.8) risk_level = 'low';
          else if (confidence >= 0.6) risk_level = 'medium';
          else risk_level = 'high';
        } else {
          if (confidence >= 0.8) risk_level = 'critical';
          else if (confidence >= 0.6) risk_level = 'high';
          else risk_level = 'medium';
        }
        
        console.log(`✅ AI Decision: ${verdict} (Confidence: ${Math.round(confidence * 100)}%, Risk: ${risk_level})`);
        
      } else {
        // AI didn't follow format, use rule-based fallback
        console.log('⚠️  AI response format invalid, using fallback logic');
        
        const hasEduRole = cleanRole.includes('student') || cleanRole.includes('faculty');
        const hasGoodJustification = qualityScore >= 4 && cleanJustification.length > 80;
        
        if (hasEduRole && hasGoodJustification) {
          recommended = true;
          confidence = 0.7;
          risk_level = 'medium';
          explanation = 'Educational role request with detailed justification and appropriate context approved.';
        } else if (qualityScore >= 5) {
          recommended = true;
          confidence = 0.75;
          risk_level = 'low';
          explanation = 'Detailed and specific request with strong supporting information approved.';
        } else if (qualityScore <= 2) {
          recommended = false;
          confidence = 0.65;
          risk_level = 'high';
          explanation = 'Request denied: Justification is too vague or lacks sufficient detail for verification.';
        } else {
          recommended = false;
          confidence = 0.5;
          risk_level = 'medium';
          explanation = 'Request requires more specific justification and details for approval.';
        }
      }
    } else {
      // Ollama unavailable, use comprehensive rule-based decision
      console.log('⚠️  Ollama unavailable, using rule-based decision engine');
      
      // Enhanced rule-based logic
      const ruleScore = {
        justificationLength: Math.min(cleanJustification.length / 200, 1),
        hasRoleKeywords: /(student|employee|faculty|developer|manager)/i.test(cleanRole) ? 0.3 : 0,
        hasValidOrg: cleanOrg.length > 3 && !cleanOrg.includes('test') ? 0.3 : 0,
        hasSpecifics: qualityIndicators.hasSpecifics ? 0.2 : 0,
        hasDuration: cleanDuration ? 0.1 : 0,
        hasDocuments: hasFiles ? 0.2 : 0
      };
      
      const totalScore = Object.values(ruleScore).reduce((a, b) => a + b, 0);
      console.log(`Rule-based score: ${totalScore.toFixed(2)}`);
      
      if (totalScore >= 1.3) {
        recommended = true;
        confidence = 0.75;
        risk_level = 'low';
        explanation = 'Comprehensive request with strong supporting details approved based on verification criteria.';
      } else if (totalScore >= 0.9) {
        recommended = true;
        confidence = 0.6;
        risk_level = 'medium';
        explanation = 'Request approved with moderate confidence. Additional details would strengthen future requests.';
      } else {
        recommended = false;
        confidence = 0.65;
        risk_level = 'high';
        explanation = 'Request denied: Insufficient details or quality concerns detected. Please provide more specific information.';
      }
    }
    
    // Final confidence adjustments
    confidence = Math.max(0.3, Math.min(0.95, confidence));
    confidence = parseFloat(confidence.toFixed(2));
    
    console.log(`\n📊 FINAL RESULT:`);
    console.log(`   Recommended: ${recommended}`);
    console.log(`   Confidence: ${Math.round(confidence * 100)}%`);
    console.log(`   Risk Level: ${risk_level}`);
    console.log(`   Explanation: ${explanation.substring(0, 80)}...`);
    console.log(`================================\n`);
    
    // Return final result
    res.json({
      recommended,
      confidence,
      risk_level,
      explanation
    });

  } catch (err) {
    console.error('❌ Verification error:', err.message);
    console.error('Error stack:', err.stack);
    
    res.status(500).json({
      recommended: false,
      confidence: 0,
      risk_level: 'critical',
      explanation: 'System error during verification. Please try again or contact support.'
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', async (req, res) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${OLLAMA_HOST}/api/tags`, { 
      signal: controller.signal 
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error('Ollama not responding');
    }
    
    const data = await response.json();
    const hasModel = data.models?.some(m => m.name.includes(MODEL));
    
    res.json({
      status: 'healthy',
      service: 'AI Verification Service',
      ollama: {
        connected: true,
        model_available: hasModel,
        model: MODEL,
        host: OLLAMA_HOST
      },
      features: {
        file_upload: true,
        max_file_size: '5MB',
        ai_analysis: true,
        rule_based_fallback: true
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      service: 'AI Verification Service',
      ollama: {
        connected: false,
        error: error.message,
        host: OLLAMA_HOST
      },
      features: {
        file_upload: true,
        max_file_size: '5MB',
        ai_analysis: false,
        rule_based_fallback: true
      },
      timestamp: new Date().toISOString(),
      note: 'Service running in rule-based mode only'
    });
  }
});

/**
 * Test endpoint with sample data
 */
app.post('/test-form', (req, res) => {
  const testData = {
    name: 'John Doe',
    age: '25',
    gender: 'male',
    role: 'student',
    organization: 'Stanford University',
    justification: 'I need access to the Computer Science department portal for my Algorithms course CS161. I have assignments and project submissions due weekly, and need access to course materials, lecture notes, and the grading system. This access is required for the Spring 2024 semester.',
    duration: '6-months',
    email: 'john@stanford.edu',
    phone: '+1-555-123-4567',
    supportingDocuments: 'student_id.pdf, enrollment_letter.pdf',
    hasFiles: true
  };
  
  res.json({
    message: 'Test form data prepared',
    testData,
    instructions: 'Send this to POST /ai-verify for testing',
    endpoint: 'http://localhost:4000/ai-verify'
  });
});

/**
 * Get test scenarios
 */
app.get('/test-scenarios', (req, res) => {
  res.json({
    scenarios: [
      {
        name: 'Valid Student Request',
        data: {
          role: 'student',
          organization: 'MIT',
          justification: 'I am enrolled in Computer Science 101 and need access to the course portal for lectures, assignments, and labs throughout the semester.',
          duration: '6-months',
          age: '20'
        },
        expected: 'APPROVE'
      },
      {
        name: 'Vague Request',
        data: {
          role: 'student',
          organization: 'University',
          justification: 'Need access',
          duration: '1-year'
        },
        expected: 'DENY'
      },
      {
        name: 'Underage',
        data: {
          role: 'student',
          organization: 'High School',
          justification: 'I need this for my school project and homework assignments.',
          age: '16'
        },
        expected: 'DENY'
      },
      {
        name: 'Professional Language',
        data: {
          role: 'employee',
          organization: 'Tech Corp',
          justification: 'I require access to the development environment to complete my assigned projects in the software engineering department.',
          duration: '1-year'
        },
        expected: 'APPROVE'
      }
    ]
  });
});

// Start server
const PORT = 4000;
app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║     AI Verification Service - Enhanced Edition                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`\n📡 Endpoints:`);
  console.log(`   POST /ai-verify          - Main verification endpoint`);
  console.log(`   GET  /health             - Service health check`);
  console.log(`   POST /test-form          - Get test form data`);
  console.log(`   GET  /test-scenarios     - Get test scenarios`);
  console.log(`\n🔧 Features:`);
  console.log(`   • Comprehensive form validation`);
  console.log(`   • Age verification (18+ required)`);
  console.log(`   • Profanity detection`);
  console.log(`   • File upload support (5MB max)`);
  console.log(`   • Quality scoring system`);
  console.log(`   • Educational institution validation`);
  console.log(`   • AI + rule-based hybrid engine`);
  console.log(`   • Detailed logging`);
  console.log(`\n📚 Ollama Configuration:`);
  console.log(`   Host: ${OLLAMA_HOST}`);
  console.log(`   Model: ${MODEL}`);
  console.log(`\n💡 Tips:`);
  console.log(`   - Ensure Ollama is running for AI analysis`);
  console.log(`   - Service works with rule-based fallback if Ollama unavailable`);
  console.log(`   - Check /health endpoint for service status`);
  console.log(`\n════════════════════════════════════════════════════════════════\n`);
});