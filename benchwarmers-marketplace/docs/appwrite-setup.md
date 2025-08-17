# Appwrite Setup Guide

This guide will help you set up Appwrite for the BenchWarmers marketplace project.

## 1. Create Appwrite Account

1. Go to [Appwrite Cloud](https://cloud.appwrite.io)
2. Sign up for a free account
3. Create a new project

## 2. Project Configuration

1. In your Appwrite console, note down your:
   - **Project ID** (found in Settings > General)
   - **API Endpoint** (usually `https://cloud.appwrite.io/v1`)

2. Create an API key:
   - Go to Settings > API Keys
   - Click "Create API Key"
   - Give it a name (e.g., "BenchWarmers Backend")
   - Select the following scopes:
     - `files.read`
     - `files.write`
     - `buckets.read`
     - `buckets.write`
   - Copy the generated API key

## 3. Storage Setup

1. Go to Storage in your Appwrite console
2. Create a new bucket:
   - Name: `benchwarmers-files`
   - File Security: Enabled
   - Maximum File Size: 50MB (or as needed)
   - Allowed File Extensions: Leave empty for all types, or specify: `jpg,jpeg,png,pdf,doc,docx`

3. Configure bucket permissions:
   - Go to your bucket settings
   - Under Permissions, add:
     - **Read access**: `users` (for authenticated users)
     - **Write access**: `users` (for authenticated users)
     - **Update access**: `users` (for authenticated users)
     - **Delete access**: `users` (for authenticated users)

## 4. Environment Variables

Update your `.env.local` file with the following:

```env
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1"
NEXT_PUBLIC_APPWRITE_PROJECT_ID="your-project-id-here"
APPWRITE_API_KEY="your-api-key-here"
APPWRITE_BUCKET_ID="your-bucket-id-here"
```

Replace the placeholder values with your actual Appwrite configuration.

## 5. Testing the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/test-appwrite` to test file upload functionality

3. Try uploading a file to verify the integration works

## 6. Production Considerations

For production deployment:

1. **Security**: Ensure proper permissions are set on your bucket
2. **File Size Limits**: Configure appropriate file size limits based on your needs
3. **File Types**: Restrict allowed file extensions for security
4. **Rate Limiting**: Configure rate limits in Appwrite settings
5. **Backup**: Set up regular backups of your storage bucket

## 7. Common Issues

### File Upload Fails
- Check that your API key has the correct permissions
- Verify bucket permissions allow write access
- Ensure file size doesn't exceed bucket limits

### CORS Errors
- Add your domain to the allowed origins in Appwrite project settings
- For development, add `http://localhost:3000`

### Authentication Issues
- Verify your project ID and endpoint are correct
- Check that your API key is valid and not expired

## 8. File Management Best Practices

1. **Organize files**: Use consistent naming conventions
2. **Clean up**: Implement file cleanup for deleted records
3. **Validation**: Always validate file types and sizes on the client and server
4. **Security**: Never expose sensitive files publicly
5. **Performance**: Consider image optimization for better performance

## Next Steps

Once Appwrite is configured, you can:
- Implement user profile picture uploads
- Add document storage for talent certifications
- Create file attachments for talent requests
- Build a comprehensive file management system