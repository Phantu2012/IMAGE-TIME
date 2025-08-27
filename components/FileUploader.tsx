/// <reference lib="dom" />

import React, { useState, useCallback } from 'react';
import { UploadIcon } from './Icons';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  accept: string;
  multiple: boolean;
  id: string;
  label: string;
  icon: React.ReactNode;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFilesSelected, accept, multiple, id, label, icon }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileNames, setFileNames] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setFileNames(files.map(f => f.name));
      onFilesSelected(files);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files).filter(file => {
          const fileType = file.type;
          const acceptedTypes = accept.split(',').map(t => t.trim());
          if (acceptedTypes.includes('.csv') && file.name.endsWith('.csv')) {
              return true;
          }
          return acceptedTypes.some(type => {
              if (type.endsWith('/*')) {
                  return fileType.startsWith(type.replace('/*', ''));
              }
              return fileType === type;
          });
      });
      if (files.length > 0) {
        setFileNames(files.map(f => f.name));
        onFilesSelected(files);
      }
    }
  }, [accept, onFilesSelected]);

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  return (
    <div className="w-full">
      <label
        htmlFor={id}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300
                    ${isDragOver ? 'border-indigo-500 bg-gray-700' : 'border-gray-600 bg-gray-800 hover:bg-gray-700'}`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <UploadIcon />
          <p className="mb-2 text-sm text-gray-400">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
        <input id={id} type="file" className="hidden" accept={accept} multiple={multiple} onChange={handleFileChange} />
      </label>
      {fileNames.length > 0 && (
          <div className="mt-2 text-sm text-gray-400 bg-gray-800 p-2 rounded">
              <div className="flex items-center font-semibold mb-1">{icon} {fileNames.length} file(s) selected:</div>
              <p className="text-xs truncate">{fileNames.join(', ')}</p>
          </div>
      )}
    </div>
  );
};