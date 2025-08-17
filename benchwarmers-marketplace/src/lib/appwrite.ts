import { Client, Account, Databases, Storage, Functions } from 'appwrite'

// Client for client-side operations
const client = new Client()

client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)

// Server client for server-side operations with API key
const serverClient = new Client()

serverClient
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)

// Set API key for server operations (only available server-side)
if (typeof window === 'undefined' && process.env.APPWRITE_API_KEY) {
  serverClient.headers = {
    ...serverClient.headers,
    'X-Appwrite-Key': process.env.APPWRITE_API_KEY
  }
}

export const account = new Account(client)
export const databases = new Databases(client)
export const storage = new Storage(client)
export const functions = new Functions(client)

// Server-side instances (for API routes)
export const serverStorage = new Storage(serverClient)
export const serverDatabases = new Databases(serverClient)

export { client, serverClient }

// Configuration constants
export const APPWRITE_CONFIG = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
  bucketId: process.env.APPWRITE_BUCKET_ID!,
  databaseId: process.env.APPWRITE_DATABASE_ID!,
}

// File upload helper
export const uploadFile = async (file: File) => {
  try {
    const response = await storage.createFile(
      APPWRITE_CONFIG.bucketId,
      'unique()',
      file
    )
    return response
  } catch (error) {
    console.error('Error uploading file:', error)
    throw error
  }
}

// Get file URL helper
export const getFileUrl = (fileId: string) => {
  return storage.getFileView(APPWRITE_CONFIG.bucketId, fileId)
}

// Delete file helper
export const deleteFile = async (fileId: string) => {
  try {
    await storage.deleteFile(APPWRITE_CONFIG.bucketId, fileId)
  } catch (error) {
    console.error('Error deleting file:', error)
    throw error
  }
}