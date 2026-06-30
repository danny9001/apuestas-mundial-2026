import { syncMatches } from '../src/lib/sync';
syncMatches().then(() => {
  console.log('Sync complete!');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
