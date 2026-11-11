// Fitur: ping → pong.
export async function handlePing(ctx) {
  if (ctx.cmd !== 'ping') return false
  await ctx.replyText('pong')
  return true
}
