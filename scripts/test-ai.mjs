import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
  const { getAIAdapter } = await import('../server/aiAdapter.ts');
  const a = getAIAdapter();
  console.log('provider:', a.name);
  const r = await a.chatCompanion({
    messages: [
      { sender: 'user', text: 'hello' },
      { sender: 'ai', text: "yo!! hey what's good?" },
      { sender: 'user', text: 'Whatt?' },
    ],
    userContext: { stage: 'open_chat', userName: 'Champ' },
  });
  console.log('REPLY:', r.reply);
}

main().catch((e) => {
  console.error('TEST FAIL:', e.message || e);
  process.exit(1);
});
