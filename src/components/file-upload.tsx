'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { uploadFile, getFileUrl, deleteFile } from '@/lib/appwrite'

interface FileUploadProps {
  onFileUploaded?: (fileId: string, fileUrl: string) => void
  onFileDeleted?: (fileId: string) => void
  accept?: string
  maxSize?: number // in MB
}

export function FileUpload({ 
  onFileUploaded, 
  onFileDeleted, 
  accept = "*/*", 
  maxSize = 10 
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    id: string
    name: string
    url: string
  }>>([])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      alert(`File size must be less than ${maxSize}MB`)
      return
    }

    setUploading(true)
    try {
      const response = await uploadFile(file)
      const fileUrl = getFileUrl(response.$id)
      
      const newFile = {
        id: response.$id,
        name: file.name,
        url: fileUrl.toString()
      }
      
      setUploadedFiles(prev => [...prev, newFile])
      onFileUploaded?.(response.$id, fileUrl.toString())
      
      // Reset input
      event.target.value = ''
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleFileDelete = async (fileId: string) => {
    try {
      await deleteFile(fileId)
      setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
      onFileDeleted?.(fileId)
    } catch (error) {
      console.error('Delete failed:', error)
      alert('Delete failed. Please try again.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          type="file"
          accept={accept}
          onChange={handleFileUpload}
          disabled={uploading}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload">
          <Button 
            type="button" 
            disabled={uploading}
            className="cursor-pointer"
          >
            {uploading ? 'Uploading...' : 'Choose File'}
          </Button>
        </label>
        <span className="text-sm text-muted-foreground">
          Max size: {maxSize}MB
        </span>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Uploaded Files:</h4>
          {uploadedFiles.map((file) => (
            <div key={file.id} className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                <span className="text-sm">{file.name}</span>
                <a 
                  href={file.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  View
                </a>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleFileDelete(file.id)}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}