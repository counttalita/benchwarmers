'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Upload, File, X, Download, Eye, AlertCircle, CheckCircle } from 'lucide-react'

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url?: string
  uploadProgress?: number
  status: 'uploading' | 'completed' | 'error'
  category: 'resume' | 'portfolio' | 'certificate' | 'other'
}

interface FileUploadProps {
  files: UploadedFile[]
  onFilesChange: (files: UploadedFile[]) => void
  maxFiles?: number
  maxFileSize?: number // in MB
  acceptedTypes?: string[]
  categories?: string[]
}

const DEFAULT_CATEGORIES = [
  { value: 'resume', label: 'Resume/CV', icon: '📄' },
  { value: 'portfolio', label: 'Portfolio', icon: '🎨' },
  { value: 'certificate', label: 'Certificate', icon: '🏆' },
  { value: 'other', label: 'Other', icon: '📎' }
]

const DEFAULT_ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
  'text/plain'
]

export default function FileUpload({
  files,
  onFilesChange,
  maxFiles = 10,
  maxFileSize = 10, // 10MB
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  categories = DEFAULT_CATEGORIES.map(c => c.value)
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('resume')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄'
    if (type.includes('word') || type.includes('document')) return '📝'
    if (type.includes('image')) return '🖼️'
    if (type.includes('text')) return '📃'
    return '📎'
  }

  const getCategoryInfo = (category: string) => {
    return DEFAULT_CATEGORIES.find(c => c.value === category) || DEFAULT_CATEGORIES[3]
  }

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size must be less than ${maxFileSize}MB`
    }
    
    if (!acceptedTypes.includes(file.type)) {
      return 'File type not supported'
    }
    
    if (files.length >= maxFiles) {
      return `Maximum ${maxFiles} files allowed`
    }
    
    if (files.some(f => f.name === file.name)) {
      return 'File with this name already exists'
    }
    
    return null
  }

  const simulateUpload = async (file: UploadedFile): Promise<void> => {
    return new Promise((resolve: any) => {
      let progress = 0
      const interval = setInterval(() => {
        progress += Math.random() * 30
        if (progress >= 100) {
          progress = 100
          clearInterval(interval)
          
          // Update file status to completed
          onFilesChange(files.map(f => 
            f.id === file.id 
              ? { ...f, status: 'completed', uploadProgress: 100, url: `https://example.com/files/${file.id}` }
              : f
          ))
          resolve()
        } else {
          // Update progress
          onFilesChange(files.map(f => 
            f.id === file.id 
              ? { ...f, uploadProgress: progress }
              : f
          ))
        }
      }, 200)
    })
  }

  const handleFileSelect = useCallback(async (selectedFiles: FileList) => {
    const newFiles: UploadedFile[] = []
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      const error = validateFile(file)
      
      if (error) {
        alert(`${file.name}: ${error}`)
        continue
      }
      
      const uploadedFile: UploadedFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading',
        uploadProgress: 0,
        category: selectedCategory as any
      }
      
      newFiles.push(uploadedFile)
    }
    
    if (newFiles.length > 0) {
      const updatedFiles = [...files, ...newFiles]
      onFilesChange(updatedFiles)
      
      // Simulate upload for each file
      newFiles.forEach(file => {
        simulateUpload(file)
      })
    }
  }, [files, selectedCategory, maxFiles, maxFileSize, acceptedTypes, onFilesChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles)
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const removeFile = (fileId: string) => {
    onFilesChange(files.filter(f => f.id !== fileId))
  }

  const updateFileCategory = (fileId: string, category: string) => {
    onFilesChange(files.map(f => 
      f.id === fileId ? { ...f, category: category as any } : f
    ))
  }

  const groupedFiles = files.reduce((acc: any, file: any) => {
    if (!acc[file.category]) {
      acc[file.category] = []
    }
    acc[file.category].push(file)
    return acc
  }, {} as Record<string, UploadedFile[]>)

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Document Upload
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload your resume, portfolio, certificates, and other relevant documents
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Document Category</label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_CATEGORIES.map((category: any) => (
                <button
                  key={category.value}
                  onClick={() => setSelectedCategory(category.value)}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    selectedCategory === category.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-1">{category.icon}</span>
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Supports PDF, DOC, DOCX, images up to {maxFileSize}MB each
            </p>
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={files.length >= maxFiles}
            >
              Choose Files
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={acceptedTypes.join(',')}
              onChange={(e: any) => e.target.files && handleFileSelect(e.target.files)}
              className="hidden"
            />
          </div>

          {/* Upload Limits */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Maximum {maxFiles} files total</p>
            <p>• Maximum {maxFileSize}MB per file</p>
            <p>• Supported formats: PDF, DOC, DOCX, JPG, PNG, GIF, TXT</p>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Files */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Uploaded Documents ({files.length}/{maxFiles})
            </h3>
          </div>

          {Object.entries(groupedFiles).map(([category, categoryFiles]) => {
            const categoryInfo = getCategoryInfo(category)
            return (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span>{categoryInfo.icon}</span>
                    {categoryInfo.label}
                    <Badge variant="outline">{categoryFiles.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {categoryFiles.map((file: any) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-2xl">{getFileIcon(file.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{file.name}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{formatFileSize(file.size)}</span>
                            {file.status === 'uploading' && file.uploadProgress !== undefined && (
                              <span>• {Math.round(file.uploadProgress)}% uploaded</span>
                            )}
                          </div>
                          
                          {/* Progress Bar */}
                          {file.status === 'uploading' && file.uploadProgress !== undefined && (
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                              <div
                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${file.uploadProgress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Status Icon */}
                        {file.status === 'uploading' && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                        )}
                        {file.status === 'completed' && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                        {file.status === 'error' && (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}

                        {/* Category Selector */}
                        <select
                          value={file.category}
                          onChange={(e: any) => updateFileCategory(file.id, e.target.value)}
                          className="text-xs border rounded px-2 py-1"
                          disabled={file.status === 'uploading'}
                        >
                          {DEFAULT_CATEGORIES.map((cat: any) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label}
                            </option>
                          ))}
                        </select>

                        {/* Actions */}
                        {file.status === 'completed' && file.url && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(file.url, '_blank')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const link = document.createElement('a')
                                link.href = file.url!
                                link.download = file.name
                                link.click()
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeFile(file.id)}
                          className="text-red-600 hover:text-red-700"
                          disabled={file.status === 'uploading'}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Upload Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">📄 Resume/CV</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Keep it updated and relevant</li>
                <li>• PDF format preferred</li>
                <li>• Include contact information</li>
                <li>• Highlight key achievements</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">🎨 Portfolio</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Showcase your best work</li>
                <li>• Include project descriptions</li>
                <li>• Multiple formats accepted</li>
                <li>• Keep file sizes reasonable</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">🏆 Certificates</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Professional certifications</li>
                <li>• Course completion certificates</li>
                <li>• Industry credentials</li>
                <li>• Clear, readable scans</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">📎 Other Documents</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• References and recommendations</li>
                <li>• Work samples</li>
                <li>• Additional credentials</li>
                <li>• Supporting materials</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
