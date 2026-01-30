import { Pinecone } from '@pinecone-database/pinecone';

let pineconeClient: Pinecone | null = null;

export function getPineconeClient() {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY not configured');
    }
    pineconeClient = new Pinecone({ apiKey });
  }
  return pineconeClient;
}

export async function getDreamIndex() {
  const pc = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX_NAME || 'dreamweaver';

  console.log('Using Pinecone index:', indexName);

  return pc.Index(indexName);
}
