import { runKnockoutCascade } from '../src/lib/sync';
runKnockoutCascade().then(() => {
  console.log('Cascade run complete!');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
