import { useState } from 'react';
import { Send, Phone, MessageSquare, CheckCircle, AlertCircle, Upload, X, Image } from 'lucide-react';
import * as XLSX from 'xlsx';

export function WhatsAppMessenger() {
  const [phoneNumbers, setPhoneNumbers] = useState('');
  const [message, setMessage] = useState('');
  const [footer, setFooter] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleSend = async () => {
    if (!phoneNumbers.trim()) {
      setStatus('error');
      setStatusMessage('Please enter at least one phone number');
      return;
    }

    if (!message.trim()) {
      setStatus('error');
      setStatusMessage('Please enter a message');
      return;
    }

    const numbers = phoneNumbers.split(',').map(num => num.trim()).filter(num => num);
    
    const invalidNumbers = numbers.filter(num => !/^\+?\d{10,15}$/.test(num));
    if (invalidNumbers.length > 0) {
      setStatus('error');
      setStatusMessage(`Invalid phone numbers: ${invalidNumbers.join(', ')}`);
      return;
    }

    setIsSending(true);
    setStatus('idle');

    try {
      let successCount = 0;
      let failedCount = 0;
      
      for (let i = 0; i < numbers.length; i++) {
        const number = numbers[i];
        try {
          const cleanNumber = number.replace(/[^0-9]/g, '');
          
          let apiUrl;
          if (imageUrl.trim()) {
            apiUrl = `https://whats-api.rcsoft.in/send-media?api_key=6hlethLW30VZHkNwFDTqzPnhqSHNCY&sender=919795666613&number=${cleanNumber}&media_type=image&caption=${encodeURIComponent(message)}&footer=${encodeURIComponent(footer)}&url=${encodeURIComponent(imageUrl)}`;
          } else {
            apiUrl = `https://whats-api.rcsoft.in/send-message?api_key=6hlethLW30VZHkNwFDTqzPnhqSHNCY&sender=919795666613&number=${cleanNumber}&message=${encodeURIComponent(message)}&footer=${encodeURIComponent(footer)}`;
          }
          
          console.log('Sending to:', cleanNumber, 'URL:', apiUrl);
          const response = await fetch(apiUrl);
          const responseData = await response.text();
          console.log('Response:', response.status, responseData);
          
          // Consider it successful if we get any 2xx response
          if (response.ok) {
            successCount++;
          } else {
            failedCount++;
            console.error('Failed for', cleanNumber, ':', responseData);
          }
          
          if (i < numbers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          console.error('Error sending to', number, ':', error);
          failedCount++;
        }
      }
      
      if (successCount > 0) {
        setStatus('success');
        setStatusMessage(`Messages sent to ${successCount} recipients. ${failedCount > 0 ? `${failedCount} failed.` : ''}`);
      } else {
        setStatus('error');
        setStatusMessage(`An error occurred, please contact the code manager.`);
      }
    } catch (error) {
      setStatus('error');
      setStatusMessage('Network error occurred while sending messages.');
    } finally {
      setIsSending(false);
    }
  };

  const clearForm = () => {
    setPhoneNumbers('');
    setMessage('');
    setFooter('Medical Communications');
    setStatus('idle');
    setStatusMessage('');
    setUploadedFile(null);
    setImageUrl('');
    setUploadedImage(null);
    const fileInput = document.getElementById('excel-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    const imageInput = document.getElementById('image-upload') as HTMLInputElement;
    if (imageInput) imageInput.value = '';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = event.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          // Extract phone numbers from 'phone' column or similar
          const phoneNumbers: string[] = [];
          
          jsonData.forEach((row: any) => {
            const keys = Object.keys(row);
            const phoneKey = keys.find(key => 
              key.toLowerCase().includes('phone') || 
              key.toLowerCase().includes('number') ||
              key.toLowerCase().includes('mobile') ||
              key.toLowerCase().includes('contact')
            ) || keys[0];
            
            if (row[phoneKey]) {
              let phoneNumber = String(row[phoneKey]).replace(/[^0-9]/g, '');
              if (phoneNumber.length >= 10) {
                // Add 91 prefix if not already present
                if (!phoneNumber.startsWith('91')) {
                  phoneNumber = '91' + phoneNumber;
                }
                phoneNumbers.push(phoneNumber);
              }
            }
          });
          
          if (phoneNumbers.length > 0) {
            setPhoneNumbers(phoneNumbers.join(', '));
            setStatus('success');
            setStatusMessage(`Extracted ${phoneNumbers.length} phone numbers from Excel file`);
          } else {
            setStatus('error');
            setStatusMessage('No valid phone numbers found in the Excel file');
          }
        } catch (error) {
          setStatus('error');
          setStatusMessage('Error reading Excel file. Please check the file format.');
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    const fileInput = document.getElementById('excel-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedImage(file);
    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('https://parul-s8xu.onrender.com/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const uploadedUrl = data.url || data.fileUrl || data.path;
        if (uploadedUrl) {
          setImageUrl(uploadedUrl);
          setStatus('success');
          setStatusMessage('Image uploaded successfully!');
        } else {
          setStatus('error');
          setStatusMessage('Upload succeeded but no URL returned');
        }
      } else {
        setStatus('error');
        setStatusMessage(`Upload failed: ${response.status}`);
      }
    } catch (error) {
      setStatus('error');
      setStatusMessage('Error uploading image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const removeImage = () => {
    setUploadedImage(null);
    setImageUrl('');
    const imageInput = document.getElementById('image-upload') as HTMLInputElement;
    if (imageInput) imageInput.value = '';
  };

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-t-2xl shadow-lg p-4 sm:p-6 lg:p-8 border-b-4 border-green-500">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-2">
            <div className="bg-green-500 p-3 lg:p-4 rounded-xl">
              <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800">WhatsApp Messenger</h1>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600">Medical & Pharmaceutical Communications</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-b-2xl shadow-lg p-4 sm:p-6 lg:p-8">
          <div className="space-y-6">
            {/* Excel File Upload */}
            <div>
              <label htmlFor="excel-upload" className="flex items-center gap-2 text-gray-700 font-semibold mb-2 text-sm sm:text-base lg:text-lg">
                <Upload className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600" />
                Upload Excel File (Optional)
              </label>
              <div className="relative">
                <input
                  id="excel-upload"
                  type="file"
                  accept=".xls,.xlsx,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="excel-upload"
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 lg:py-4 text-sm sm:text-base border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 transition-colors cursor-pointer flex items-center justify-center gap-2 bg-gray-50 hover:bg-green-50"
                >
                  <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                  <span className="text-gray-600">
                    {uploadedFile ? 'Change file' : 'Click to upload Excel file'}
                  </span>
                </label>
              </div>
              {uploadedFile && (
                <div className="mt-2 flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-green-700 truncate">
                      {uploadedFile.name}
                    </span>
                  </div>
                  <button
                    onClick={removeFile}
                    className="text-green-600 hover:text-green-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <p className="text-xs sm:text-sm text-gray-500 mt-2">
                Upload an Excel file (.xls, .xlsx) or CSV file containing phone numbers
              </p>
            </div>

            {/* Image Upload & URL */}
            <div>
              <label className="flex items-center gap-2 text-gray-700 font-semibold mb-2 text-sm sm:text-base lg:text-lg">
                <Image className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600" />
                Image (Optional)
              </label>
              
              {/* Image Upload */}
              <div className="mb-3">
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploadingImage}
                  className="hidden"
                />
                <label
                  htmlFor="image-upload"
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 transition-colors cursor-pointer flex items-center justify-center gap-2 bg-gray-50 hover:bg-green-50"
                >
                  {isUploadingImage ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-gray-600">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                      <span className="text-gray-600">
                        {uploadedImage ? 'Change image' : 'Click to upload image'}
                      </span>
                    </>
                  )}
                </label>
              </div>

              {uploadedImage && (
                <div className="mb-3 flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-green-700 truncate">
                      {uploadedImage.name}
                    </span>
                  </div>
                  <button
                    onClick={removeImage}
                    className="text-green-600 hover:text-green-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Image URL Input */}
              <div className="relative">
                <span className="text-xs text-gray-600 mb-1 block">Or paste image URL:</span>
                <input
                  id="image-url"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
                />
              </div>
              
              <p className="text-xs sm:text-sm text-gray-500 mt-2">
                Upload an image or paste an image URL to send with your message
              </p>
            </div>

            {/* Phone Numbers Field */}
            <div>
              <label htmlFor="phone-numbers" className="flex items-center gap-2 text-gray-700 font-semibold mb-2 text-sm sm:text-base lg:text-lg">
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600" />
                Phone Numbers
              </label>
              <input
                id="phone-numbers"
                type="text"
                value={phoneNumbers}
                onChange={(e) => setPhoneNumbers(e.target.value)}
                placeholder="Enter phone numbers separated by commas (e.g., 911234567890, 9176543210)"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 lg:py-4 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
              />
              <p className="text-xs sm:text-sm text-gray-500 mt-2">
                Tip: Include country code (e.g.91 for India) Do not add '+' or '00' prefixes
              </p>
            </div>

            {/* Message Field */}
            <div className="flex-1">
              <label htmlFor="message" className="flex items-center gap-2 text-gray-700 font-semibold mb-2 text-sm sm:text-base lg:text-lg">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600" />
                Message
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message here... (e.g., medication reminders, health updates, appointment notifications)"
                rows={10}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 lg:py-4 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 transition-colors resize-y"
              />
              <p className="text-xs sm:text-sm text-gray-500 mt-2">
                Character count: {message.length}
              </p>
            </div>

            {/* Footer Field */}
            <div>
              <label htmlFor="footer" className="flex items-center gap-2 text-gray-700 font-semibold mb-2 text-sm sm:text-base lg:text-lg">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600" />
                Footer
              </label>
              <input
                id="footer"
                type="text"
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                placeholder="Enter footer text (e.g., Medical Communications, Parul Homoeo Laboratories)"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 lg:py-4 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
              />
              <p className="text-xs sm:text-sm text-gray-500 mt-2">
                Footer appears at the bottom of WhatsApp messages
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={handleSend}
                disabled={isSending}
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold py-3 sm:py-4 lg:py-5 px-4 sm:px-6 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-md hover:shadow-lg text-sm sm:text-base lg:text-lg"
              >
                {isSending ? (
                  <>
                    <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                    Send Messages
                  </>
                )}
              </button>
              <button
                onClick={clearForm}
                disabled={isSending}
                className="px-4 sm:px-6 py-3 sm:py-4 lg:py-5 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm sm:text-base lg:text-lg"
              >
                Clear Form
              </button>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {status !== 'idle' && (
          <div className={`mt-6 flex items-center gap-3 p-3 sm:p-4 rounded-lg ${
            status === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {status === 'success' ? (
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0" />
            )}
            <p className={`text-sm sm:text-base ${status === 'success' ? 'text-green-700' : 'text-red-700'}`}>
              {statusMessage}
            </p>
          </div>
        )}

        {/* Additional Information */}
        <div className="mt-6 space-y-4">
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-5">
            <h3 className="font-semibold text-blue-900 mb-3 text-base sm:text-lg text-center">Important Information</h3>
            <ul className="text-xs sm:text-sm text-blue-800 space-y-2">
              <li>• Ensure phone numbers include country codes</li>
              <li>• Multiple numbers should be separated by commas</li>
              <li>• Messages will be sent via WhatsApp Business API</li>
              <li>• Keep messages professional and compliant with medical regulations</li>
            </ul>
          </div>

          {/* Footer Note */}
          <div className="text-center text-xs sm:text-sm text-gray-600 bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
            <p>
              <strong>Note:</strong> This application requires WhatsApp Business API credentials to function.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
