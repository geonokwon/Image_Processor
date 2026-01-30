#!/usr/bin/env node
/**
 * 비밀번호 해시 생성 스크립트
 * 
 * 사용법:
 *   node scripts/generate-password-hash.js
 *   또는
 *   npm run generate:password
 */

const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('='.repeat(60));
console.log('🔐 비밀번호 해시 생성기 (bcrypt)');
console.log('='.repeat(60));
console.log('');

rl.question('비밀번호를 입력하세요: ', async (password) => {
  if (!password || password.length < 8) {
    console.error('❌ 비밀번호는 최소 8자 이상이어야 합니다.');
    rl.close();
    process.exit(1);
  }

  try {
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    
    console.log('');
    console.log('✅ 해시 생성 완료!');
    console.log('');
    console.log('-'.repeat(60));
    console.log('다음 내용을 .env 파일에 추가하세요:');
    console.log('-'.repeat(60));
    console.log('');
    console.log(`AUTH_PASSWORD_HASH=${hash}`);
    console.log('');
    console.log('-'.repeat(60));
    console.log('⚠️  보안 주의사항:');
    console.log('   - 이 해시를 .env 파일에 저장하세요');
    console.log('   - .env 파일은 절대 Git에 커밋하지 마세요');
    console.log('   - 원본 비밀번호는 안전한 곳에 보관하세요');
    console.log('-'.repeat(60));
    
  } catch (error) {
    console.error('❌ 해시 생성 중 오류:', error);
    process.exit(1);
  }
  
  rl.close();
});

rl.on('close', () => {
  process.exit(0);
});

