const JSONBLOB_ID = '019e55ce-5d96-74fa-9e94-28e1788f4d4f';
const JSONBLOB_API = 'https://jsonblob.com/api/jsonBlob/' + JSONBLOB_ID;

module.exports = async (req, res) => {
  // CORS Headers for cross-origin or local testing flexibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const response = await fetch(JSONBLOB_API, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        return res.status(response.status).json({ error: `JSONBlob GET failed: ${response.statusText}` });
      }
      
      const data = await response.json();
      return res.status(200).json(data);
    } catch (e) {
      console.error('Proxy GET error:', e);
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      
      const response = await fetch(JSONBLOB_API, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: bodyStr
      });
      
      if (!response.ok) {
        return res.status(response.status).json({ error: `JSONBlob PUT failed: ${response.statusText}` });
      }
      
      const data = await response.json();
      return res.status(200).json(data);
    } catch (e) {
      console.error('Proxy PUT error:', e);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
