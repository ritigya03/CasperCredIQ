export const CASPER_CONFIG = {
  NODE_URL: "http://65.109.83.79:7777/rpc",
  CHAIN_NAME: "casper-test",
  
  CONTRACT_HASH: "hash-73c2708ee69c1989183876a7a089e220db206f8820fb2e58c0b062d3370ab8fa",
  
  PAYMENT_AMOUNTS: {
    MINT: "10000000000",      // 10 CSPR
    REVOKE: "1000000000",     // 1 CSPR
  },
  
  ISSUER_ADDRESS: "account-hash-e1b084e5c3bb3566cbc1f7446bce854bbfde6f26e1ff225a82a6dcfadf44c290",
  
  AVAILABLE_ROLES: [
    { value: "admin", label: "Admin", resources: ["Dashboard", "User Management", "System Settings"] },
    { value: "developer", label: "Developer", resources: ["Code Repository", "API Docs", "Dev Tools"] },
    { value: "user", label: "User", resources: ["Profile", "Basic Features", "Help Center"] },
  ],
} as const;