export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { webhookUrl, updates, action } = body;

    if (!webhookUrl || typeof webhookUrl !== 'string') {
      return res.status(400).json({ error: 'لم يتم توفير رابط Webhook صالح' });
    }

    const cleanUrl = webhookUrl.trim();

    // Ping check
    if (action === 'ping') {
      try {
        const response = await fetch(cleanUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'ping' }),
          redirect: 'follow'
        });

        const text = await response.text();
        let parsed: any = null;
        try {
          parsed = JSON.parse(text);
        } catch {
          if (text.includes('ServiceLogin') || text.includes('accounts.google.com')) {
            return res.status(400).json({
              error: "صلاحية الوصول غير صحيحة: يرجى فتح سكريبت الشيت وجعل صلاحية النشر 'Who has access' = 'Anyone' (أي شخص)."
            });
          }
        }

        if (parsed && (parsed.status === 'success' || parsed.status === 'ok')) {
          return res.status(200).json({ success: true, response: parsed });
        }
      } catch (postErr) {
        console.warn('Vercel API POST ping failed, falling back to GET:', postErr);
      }

      // GET fallback for ping
      try {
        const getRes = await fetch(cleanUrl, {
          method: 'GET',
          redirect: 'follow'
        });
        const getText = await getRes.text();
        if (getText.includes('ServiceLogin') || getText.includes('accounts.google.com')) {
          return res.status(400).json({
            error: "يتطلب الإذن: يرجى ضبط النشر (Deployment) على 'Anyone' حتى يتمكن التطبيق من الاتصال بالشيت."
          });
        }
        return res.status(200).json({
          success: true,
          response: { status: 'success', message: 'تم الاتصال بنجاح بشيت جوجل!' }
        });
      } catch (getErr: any) {
        return res.status(500).json({
          error: `تعذر الوصول لرابط الويب هوك: ${getErr.message || 'خطأ في الاتصال'}`
        });
      }
    }

    // Sync updates
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    let response: Response;
    try {
      response = await fetch(cleanUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ updates: updates || [] }),
        redirect: 'follow',
        signal: controller.signal
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr.name === 'AbortError') {
        return res.status(504).json({ error: 'استغرقت استجابة شيت جوجل أكثر من 60 ثانية (Timeout).' });
      }
      return res.status(500).json({ error: `تعذر الاتصال برابط الويب هوك: ${fetchErr.message || 'خطأ في الشبكة'}` });
    }
    clearTimeout(timeoutId);

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      if (text.includes('ServiceLogin') || text.includes('accounts.google.com')) {
        return res.status(400).json({
          error: "فشل الترحيل: يرجى ضبط صلاحية الويب هوك في Google Apps Script إلى Anyone (أي شخص)."
        });
      }
      data = { status: 'success', raw: text };
    }

    return res.status(200).json({ success: true, response: data });
  } catch (error: any) {
    console.error('Vercel sync handler error:', error);
    return res.status(500).json({ error: error.message || 'فشل الاتصال بخادم مزامنة شيت جوجل' });
  }
}
