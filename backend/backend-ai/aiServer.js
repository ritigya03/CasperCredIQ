import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(bodyParser.json());

const OLLAMA_HOST = 'http://localhost:11434';
const MODEL = 'tinyllama';

/**
 * Simple Ollama call
 */
async function askOllama(question) {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt: question,
        stream: false,
        options: { temperature: 0.3, num_predict: 150 }
      }),
      timeout: 15000
    });
    
    const data = await response.json();
    return data.response.trim();
  } catch (error) {
    console.log('Ollama unavailable');
    return null;
  }
}

/**
 * AI Verification Endpoint - Enhanced for form data
 */
app.post('/ai-verify', async (req, res) => {
  try {
    // Extract data from form - matching frontend fields
    const { 
      role, 
      organization, 
      justification,
      duration,
      name,
      age,
      gender
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
      return res.json({
        recommended: false,
        confidence: 0.95,
        risk_level: 'critical',
        explanation: 'Request denied: Unprofessional language detected. Please maintain professional communication standards.'
      });
    }

    // 2. Age validation (if provided)
    if (cleanAge !== null && cleanAge < 18) {
      return res.json({
        recommended: false,
        confidence: 0.9,
        risk_level: 'high',
        explanation: 'Request denied: Applicant must be at least 18 years old.'
      });
    }

    // 3. Student-specific organization validation
    if (cleanRole.includes('student') || cleanRole.includes('faculty') || cleanRole.includes('professor')) {
      const invalidOrgs = [
        'do not provide', 'not provided', 'none', 'na', 'n/a', 
        'unknown', 'test', 'example', 'temp', 'asdf', 'qwerty',
        '123', 'aaa', 'test company', 'sample', 'demo'
      ];
      
      if (invalidOrgs.some(invalid => cleanOrg.includes(invalid))) {
        return res.json({
          recommended: false,
          confidence: 0.9,
          risk_level: 'high',
          explanation: 'Request denied: Educational roles require a valid institution name. Please provide the official name of your school, college, or university.'
        });
      }
      
      // Check if organization sounds educational
      const eduKeywords = ['university', 'college', 'school', 'institute', 'academy', 'polytechnic', 'campus'];
      const soundsEducational = eduKeywords.some(keyword => cleanOrg.includes(keyword));
      
      if (!soundsEducational) {
        // Warning but not denial - will be handled in AI analysis
        console.log('Warning: Organization does not sound educational for student role');
      }
    }

    // 4. Gibberish detection
    const hasGibberish = /(.)\1{4,}/.test(textToCheck) || // 5+ repeated characters
                        /^[0-9]+$/.test(cleanOrg) ||
                        cleanOrg.length < 2 ||
                        ['test', 'asdf', 'qwerty', '123', 'aaa', 'xyz', 'abc'].includes(cleanOrg);
    
    if (hasGibberish) {
      return res.json({
        recommended: false,
        confidence: 0.85,
        risk_level: 'high',
        explanation: 'Request denied: Invalid or placeholder information detected. Please provide valid details.'
      });
    }

    // 5. Justification length check
    if (cleanJustification.length < 50) {
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
    
    // Check justification quality indicators
    const qualityIndicators = {
      hasSpecifics: /(project|task|assignment|course|work|job|duty|responsibilit)/i.test(cleanJustification),
      hasTimeframe: /(week|month|year|semester|quarter|duration)/i.test(cleanJustification),
      hasPurpose: /(need|require|necessary|essential|important|critical)/i.test(cleanJustification),
      hasDetails: cleanJustification.length > 100,
      mentionsOrg: new RegExp(cleanOrg.split(' ')[0], 'i').test(cleanJustification)
    };
    
    const qualityScore = Object.values(qualityIndicators).filter(Boolean).length;
    
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
- Detailed justification: ${qualityIndicators.hasDetails ? 'YES' : 'NO'}
- Mentions specific tasks/projects: ${qualityIndicators.hasSpecifics ? 'YES' : 'NO'}
- Includes timeframe: ${qualityIndicators.hasTimeframe ? 'YES' : 'NO'}
- Clear purpose stated: ${qualityIndicators.hasPurpose ? 'YES' : 'NO'}
- Mentions organization: ${qualityIndicators.mentionsOrg ? 'YES' : 'NO'}

IMPORTANT NOTES:
- Student/faculty roles should have educational context
- High-privilege roles need strong justification
- Vague justifications are suspicious
- Professional communication expected

RESPONSE FORMAT:
Provide your final assessment in this exact format:

VERDICT: [APPROVE or DENY]
CONFIDENCE: [HIGH, MEDIUM, or LOW]
EXPLANATION: [2-3 sentence explanation of your decision]

Example:
VERDICT: APPROVE
CONFIDENCE: HIGH
EXPLANATION: The justification clearly explains the need for student access to course materials at Stanford University for a specific semester.

Now analyze the above request:
`;

    console.log('Sending to AI for analysis...');
    const aiResponse = await askOllama(aiPrompt);
    
    let recommended = false;
    let confidence = 0.5;
    let risk_level = 'medium';
    let explanation = 'Unable to process request. Please try again.';
    
    if (aiResponse) {
      console.log('AI Response:', aiResponse);
      
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
        } else {
          // Fallback explanation
          explanation = recommended ? 
            'AI analysis indicates this request appears legitimate and appropriate.' :
            'AI analysis identified concerns with this request.';
        }
        
        // Adjust confidence based on quality indicators
        if (qualityScore >= 4) {
          confidence = Math.min(confidence + 0.1, 0.95);
        } else if (qualityScore <= 1) {
          confidence = Math.max(confidence - 0.15, 0.3);
        }
        
        // Role-specific adjustments
        if (cleanRole.includes('admin') || cleanRole.includes('root') || cleanRole.includes('superuser')) {
          if (recommended) {
            confidence *= 0.9; // Slightly reduce confidence for admin approvals
            risk_level = 'medium'; // Admin roles always have some risk
          } else {
            confidence = Math.max(confidence, 0.7); // Higher confidence for admin denials
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
        
      } else {
        // AI didn't follow format, use rule-based fallback
        console.log('AI response format invalid, using fallback logic');
        
        // Rule-based fallback decision
        const hasEduRole = cleanRole.includes('student') || cleanRole.includes('faculty');
        const hasGoodJustification = qualityScore >= 3 && cleanJustification.length > 80;
        
        if (hasEduRole && hasGoodJustification) {
          recommended = true;
          confidence = 0.7;
          risk_level = 'medium';
          explanation = 'Educational role request with detailed justification approved.';
        } else if (qualityScore >= 4) {
          recommended = true;
          confidence = 0.75;
          risk_level = 'low';
          explanation = 'Detailed and specific request approved.';
        } else if (qualityScore <= 1) {
          recommended = false;
          confidence = 0.65;
          risk_level = 'high';
          explanation = 'Request denied: Justification is too vague or insufficient.';
        } else {
          recommended = false;
          confidence = 0.5;
          risk_level = 'medium';
          explanation = 'Request requires more specific justification for approval.';
        }
      }
    } else {
      // Ollama unavailable, use comprehensive rule-based decision
      console.log('Ollama unavailable, using rule-based decision');
      
      // Enhanced rule-based logic
      const ruleScore = {
        justificationLength: Math.min(cleanJustification.length / 200, 1), // Max 1 point for 200+ chars
        hasRoleKeywords: /(student|employee|faculty|developer|manager)/i.test(cleanRole) ? 0.3 : 0,
        hasValidOrg: cleanOrg.length > 3 && !cleanOrg.includes('test') ? 0.3 : 0,
        hasSpecifics: qualityIndicators.hasSpecifics ? 0.2 : 0,
        hasDuration: cleanDuration ? 0.1 : 0
      };
      
      const totalScore = Object.values(ruleScore).reduce((a, b) => a + b, 0);
      
      if (totalScore >= 1.2) {
        recommended = true;
        confidence = 0.7;
        risk_level = 'low';
        explanation = 'Comprehensive request approved based on provided details.';
      } else if (totalScore >= 0.8) {
        recommended = true;
        confidence = 0.6;
        risk_level = 'medium';
        explanation = 'Request approved with some reservations. More details would improve confidence.';
      } else {
        recommended = false;
        confidence = 0.65;
        risk_level = 'high';
        explanation = 'Request denied: Insufficient details or quality issues detected.';
      }
    }
    
    // Final confidence adjustments
    confidence = Math.max(0.3, Math.min(0.95, confidence));
    confidence = parseFloat(confidence.toFixed(2));
    
    // Return final result
    res.json({
      recommended,
      confidence,
      risk_level,
      explanation
    });

  } catch (err) {
    console.error('Verification error:', err.message);
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
    // Check Ollama connection
    const response = await fetch(`${OLLAMA_HOST}/api/tags`, { timeout: 5000 });
    
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
        model: MODEL
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      service: 'AI Verification Service',
      ollama: {
        connected: false,
        error: error.message
      },
      timestamp: new Date().toISOString(),
      note: 'Service running in rule-based mode only'
    });
  }
});

/**
 * Test endpoint with form data
 */
app.post('/test-form', (req, res) => {
  const testData = {
    name: 'John Doe',
    age: '25',
    gender: 'male',
    role: 'student',
    organization: 'Stanford University',
    justification: 'I need access to the Computer Science department portal for my Algorithms course CS161. I have assignments and project submissions due weekly, and need access to course materials, lecture notes, and the grading system.',
    duration: '6-months',
    email: 'john@stanford.edu',
    phone: '+1-555-123-4567'
  };
  
  res.json({
    message: 'Test form data prepared',
    testData,
    instructions: 'Send this to POST /ai-verify for testing'
  });
});

app.listen(4000, () => {
  console.log('✅ AI Verification Service running on http://localhost:4000');
  console.log('📝 Endpoint: POST /ai-verify');
  console.log('❤️  Health check: GET /health');
  console.log('🧪 Test endpoint: POST /test-form');
  console.log('\n🔧 Service Features:');
  console.log('   • Comprehensive form data processing');
  console.log('   • Age validation (18+ required)');
  console.log('   • Bad word detection');
  console.log('   • Justification quality scoring');
  console.log('   • Educational institution validation');
  console.log('   • Duration consideration');
  console.log('   • AI + rule-based hybrid decision making');
});