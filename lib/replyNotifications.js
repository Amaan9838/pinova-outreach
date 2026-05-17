function compact(value, maxLength = 1200) {
  if (!value) return '';
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function getProspectName(prospect) {
  if (!prospect) return 'Unknown prospect';
  const name = `${prospect.firstName || ''} ${prospect.lastName || ''}`.trim();
  return name || prospect.email || 'Unknown prospect';
}

function buildReplyNotificationText({ originalMessage, parsedEmail, replyText }) {
  const prospect = originalMessage?.prospectId;
  const campaign = originalMessage?.campaignId;
  const mailbox = originalMessage?.mailboxId;
  const fromEmail = parsedEmail?.from?.value?.[0]?.address || prospect?.email || 'unknown sender';

  return [
    'New email reply received',
    '',
    `Prospect: ${getProspectName(prospect)}`,
    `From: ${fromEmail}`,
    `Mailbox: ${mailbox?.fromEmail || originalMessage?.mailboxId || 'unknown mailbox'}`,
    `Campaign: ${campaign?.name || originalMessage?.campaignId || 'unknown campaign'}`,
    `Subject: ${parsedEmail?.subject || '(no subject)'}`,
    '',
    compact(replyText, 1500)
  ].join('\n');
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Notification webhook failed: ${response.status} ${response.statusText}`);
  }
}

function buildTelegramSendMessageUrl(token) {
  const host = ['api', 'telegram', 'org'].join('.');
  return `https://${host}/bot${token}/sendMessage`;
}

async function sendTelegramNotification(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  await postJson(buildTelegramSendMessageUrl(token), {
    chat_id: chatId,
    text,
    disable_web_page_preview: true
  });
  return true;
}

async function sendSlackNotification(text) {
  const webhookUrl = process.env.SLACK_REPLY_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return false;

  await postJson(webhookUrl, { text });
  return true;
}

async function sendGenericWebhook(text, context) {
  const webhookUrl = process.env.REPLY_NOTIFICATION_WEBHOOK_URL;
  if (!webhookUrl) return false;

  await postJson(webhookUrl, { text, context, event: 'reply_received' });
  return true;
}

export async function notifyReplyReceived(context) {
  const replyText = context.replyText || context.parsedEmail?.text || context.parsedEmail?.html || '';
  const text = buildReplyNotificationText({ ...context, replyText });

  const results = await Promise.allSettled([
    sendTelegramNotification(text),
    sendSlackNotification(text),
    sendGenericWebhook(text, {
      campaignId: context.originalMessage?.campaignId?._id || context.originalMessage?.campaignId,
      prospectId: context.originalMessage?.prospectId?._id || context.originalMessage?.prospectId,
      mailboxId: context.originalMessage?.mailboxId?._id || context.originalMessage?.mailboxId,
      subject: context.parsedEmail?.subject || ''
    })
  ]);

  results.forEach((result) => {
    if (result.status === 'rejected') {
      console.error('[replyNotifications] Delivery failed:', result.reason?.message || result.reason);
    }
  });

  return results.some((result) => result.status === 'fulfilled' && result.value === true);
}
