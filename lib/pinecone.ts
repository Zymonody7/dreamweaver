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
  // Extract index name from the Pinecone URL
  // https://dreamweaver-fa987t0.svc.aped-4627-b74a.pinecone.io
  return pc.Index('dreamweaver');
}
