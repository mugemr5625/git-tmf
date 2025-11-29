import React, { useState, useEffect } from "react";
import { notification, Form, Input, Button, Upload, message, Divider, Space, Card, Spin, Modal, Alert } from "antd";
import { UploadOutlined, CloudUploadOutlined, FileOutlined, DeleteOutlined, EyeOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import { UPLOAD, GET, DELETE } from "helpers/api_helper";
import { useNavigate } from "react-router-dom";


const AddCustomerDocument = ({ customerId, onPrevious, onCancel }) => {
  const [form] = Form.useForm();
  const [loader, setLoader] = useState(false);

  // State for uploaded files (similar to AddBranch)
  const [aadhaarFiles, setAadhaarFiles] = useState([null]);
  const [panFiles, setPanFiles] = useState([null]);
  const [locationFiles, setLocationFiles] = useState([null]);
  const [otherFiles, setOtherFiles] = useState([null]);

  // State for existing documents
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState(null);

  // Preview states
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewContent, setPreviewContent] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (customerId) {
      form.setFieldsValue({ customer_id: customerId });
      fetchExistingDocuments();
      
      // Initialize form lists
      form.setFieldsValue({
        aadhaar_details: [{ file: [], description: "" }],
        pan_details: [{ file: [], description: "" }],
        location_details: [{ file: [], description: "" }],
        other_details: [{ file: [], description: "" }],
      });
    }
  }, [customerId, form]);

  const fetchExistingDocuments = async () => {
    setLoadingDocuments(true);
    try {
      const response = await GET(`/api/customer-documents/customer/${customerId}/documents/`);
      
      if (response && response.error) {
        setExistingDocuments([]);
        return;
      }
      
      if (response && Array.isArray(response.data)) {
        setExistingDocuments(response.data);
      } else if (response && Array.isArray(response)) {
        setExistingDocuments(response);
      } else {
        setExistingDocuments([]);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setExistingDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const getDocumentsByType = (type) => {
    if (!Array.isArray(existingDocuments)) return [];
    return existingDocuments.filter(doc => doc.document_type === type);
  };

  // Upload file handler (similar to AddBranch)
  const uploadFile = async (file, onSuccess, onError, type, index) => {
    try {
      const formData = new FormData();
      formData.append('customer_id', String(customerId));
      formData.append('document_type', type);
      
      // Get description from form
      const formFieldName = `${type}_details`;
      const details = form.getFieldValue(formFieldName);
      const description = details?.[index]?.description || `${type} document`;
      formData.append('document_description', description);
      formData.append('document_file', file, file.name);

      const response = await UPLOAD('/api/customer-documents/', formData);

      if (response.status === 201 || response.status === 200) {
        const { file_url, id } = response.data;
        
        // Update file state based on type
        const fileData = { file_url, file_name: file.name, id };
        switch(type) {
          case 'aadhaar':
            setAadhaarFiles(prev => {
              const newFiles = [...prev];
              newFiles[index] = fileData;
              return newFiles;
            });
            break;
          case 'pan':
            setPanFiles(prev => {
              const newFiles = [...prev];
              newFiles[index] = fileData;
              return newFiles;
            });
            break;
          case 'location_photo':
            setLocationFiles(prev => {
              const newFiles = [...prev];
              newFiles[index] = fileData;
              return newFiles;
            });
            break;
          case 'other':
            setOtherFiles(prev => {
              const newFiles = [...prev];
              newFiles[index] = fileData;
              return newFiles;
            });
            break;
        }

        message.success(`${file.name} uploaded successfully`);
        onSuccess('ok');
        
        // Refresh existing documents
        fetchExistingDocuments();
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      message.error(`${file.name} upload failed`);
      onError(error);
    }
  };

  // Remove file handler
  const fileRemove = (type, index) => {
    switch(type) {
      case 'aadhaar':
        setAadhaarFiles(prev => prev.map((item, i) => (i === index ? null : item)));
        break;
      case 'pan':
        setPanFiles(prev => prev.map((item, i) => (i === index ? null : item)));
        break;
      case 'location_photo':
        setLocationFiles(prev => prev.map((item, i) => (i === index ? null : item)));
        break;
      case 'other':
        setOtherFiles(prev => prev.map((item, i) => (i === index ? null : item)));
        break;
    }
  };

  // Delete document handler
  const handleDeleteDocument = async (documentId) => {
    Modal.confirm({
      title: 'Delete Document',
      content: 'Are you sure you want to delete this document? This action cannot be undone.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setDeletingDocId(documentId);
          const response = await DELETE(`/api/customer-documents/${documentId}/`);
          
          if (response.status === 204 || response.status === 200) {
            notification.success({
              message: 'Success',
              description: 'Document deleted successfully',
              duration: 3,
            });
            fetchExistingDocuments();
          } else {
            notification.error({
              message: 'Delete Failed',
              description: 'Failed to delete document',
              duration: 3,
            });
          }
        } catch (error) {
          notification.error({
            message: 'Delete Failed',
            description: error.response?.data?.error || 'An error occurred',
            duration: 3,
          });
        } finally {
          setDeletingDocId(null);
        }
      },
    });
  };

  // PDF Preview Component
  const SecurePDFPreview = ({ url }) => {
    const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    return (
      <div style={{ margin: 0, padding: 0 }}>
        <div style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
          <Button 
            type="primary" 
            size="small"
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
          >
            Open PDF in New Tab
          </Button>
        </div>
        <Alert
          message="Using Google Docs Viewer for reliable preview."
          type="info"
          showIcon
          style={{ marginBottom: 8, padding: '4px 12px' }}
        />
        <iframe
          src={googleViewerUrl}
          title="PDF Preview"
          width="100%"
          height="600px"
          style={{ border: '1px solid #d9d9d9', borderRadius: 4, display: 'block', margin: 0 }}
        />
      </div>
    );
  };

  // View document handler
  const viewDocument = async (documentData, fileName) => {
    let documentUrl = documentData;
    
    if (typeof documentData === 'object' && documentData !== null) {
      documentUrl = documentData.file_url || documentData.signed_url || documentData.url;
    }
    
    if (!documentUrl || typeof documentUrl !== 'string') {
      notification.error({
        message: 'Error',
        description: 'Document URL not found',
        duration: 3,
      });
      return;
    }

    const urlWithoutParams = documentUrl.split('?')[0];
    const fileExtension = urlWithoutParams.split('.').pop().toLowerCase();
    
    if (fileExtension === 'pdf') {
      setPreviewType('pdf');
      setPreviewContent(documentUrl);
      setPreviewVisible(true);
      return;
    }

    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension)) {
      setPreviewType('image');
      setPreviewContent(documentUrl);
      setPreviewVisible(true);
      setPreviewLoading(true);
      return;
    }

    window.open(documentUrl, '_blank');
  };

  // Render existing documents
  const renderExistingDocuments = (type, title) => {
    const documents = getDocumentsByType(type);
    if (documents.length === 0) return null;

    return (
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: '#666' }}>
          Existing {title}:
        </div>
        {documents.map((doc, index) => (
          <Card key={doc.id || index} size="small" style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
                <div>
                  <div style={{ fontWeight: '500' }}>
                    {doc.document_file_name || doc.document_file?.original_name || 'Document'}
                  </div>
                  {doc.document_description && (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {doc.document_description}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: '#999' }}>
                    Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <Space>
                <Button 
                  type="link" 
                  icon={<EyeOutlined />}
                  onClick={() => viewDocument(doc, doc.document_file?.original_name)}
                  size="small"
                >
                  View
                </Button>
                <Button 
                  type="link" 
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteDocument(doc.id)}
                  size="small"
                  loading={deletingDocId === doc.id}
                  disabled={deletingDocId === doc.id}
                >
                  Delete
                </Button>
              </Space>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  // Render document fields
  const renderDocumentFields = (fieldName, type, title, maxFields) => (
    <Form.List name={fieldName}>
      {(fields, { add, remove }) => (
        <>
          {fields.map(({ key, name, ...restField }, index) => (
            <div key={key} className="row mb-3">
              <div className="col-md-6">
                <Form.Item
                  {...restField}
                  name={[name, 'file']}
                  label="File Upload"
                  rules={[{ required: true, message: 'Please upload a file' }]}
                  valuePropName="fileList"
                  getValueFromEvent={e => e && e.fileList}
                >
                  <Upload
                    maxCount={1}
                    customRequest={({ file, onSuccess, onError }) =>
                      uploadFile(file, onSuccess, onError, type, index)
                    }
                    onRemove={() => fileRemove(type, index)}
                    accept=".pdf,.png,.jpeg,.jpg"
                  >
                    <Button icon={<UploadOutlined />}>Upload</Button>
                  </Upload>
                </Form.Item>
              </div>

              <div className="col-md-6">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <Form.Item
                    {...restField}
                    name={[name, 'description']}
                    label="Description"
                    rules={[{ required: true, message: 'Please enter description' }]}
                    style={{ flexGrow: 1 }}
                  >
                    <Input.TextArea
                      placeholder={`Enter ${type} description`}
                      autoSize={{ minRows: 1, maxRows: 6 }}
                      allowClear
                    />
                  </Form.Item>

                  {index > 0 && (
                    <Button
                      type="primary"
                      danger
                      shape="circle"
                      icon={<MinusOutlined />}
                      onClick={() => {
                        remove(name);
                        fileRemove(type, index);
                      }}
                      style={{
                        width: 33,
                        height: 33,
                        marginTop: '25px',
                        backgroundColor: 'red',
                        borderColor: 'red',
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}

          {fields.length < maxFields && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <Button
                type="primary"
                shape="circle"
                icon={<PlusOutlined />}
                onClick={() => add()}
                style={{
                  width: 35,
                  height: 35,
                  backgroundColor: '#28a745',
                  borderColor: '#28a745',
                  color: '#fff',
                }}
              />
            </div>
          )}
        </>
      )}
    </Form.List>
  );

  return (
    <div className="page-content" style={{ marginRight: "10px", marginLeft: "-10px", maxWidth: "100%" }}>
      <div className="container-fluid" style={{ marginTop: -100, padding: 0 }}>
        <div className="row">
          <div className="col-md-12">
            <Spin spinning={loadingDocuments} tip="Loading documents...">
              <Form 
                form={form} 
                layout="vertical"
                style={{ padding: 0, marginRight: "-20px", marginBottom: "-30px", marginTop: "20px" }}
              >
                <div className="container" style={{ padding: 0 }}>
                  
                  {/* Customer ID */}
                  <div className="row mb-1 mt-2">
                    <div className="col-md-12">
                      <Form.Item label="Customer ID" name="customer_id">
                        <Input 
                          placeholder="Customer ID" 
                          size="large" 
                          disabled 
                          style={{ backgroundColor: '#f5f5f5', color: '#000', fontWeight: '600' }}
                        />
                      </Form.Item>
                    </div>
                  </div>

                  {/* Aadhaar Documents */}
                  <Divider style={{ borderTop: "2px solid #d9d9d9" }} />
                  <Divider orientation="center">Aadhaar Document</Divider>
                  {renderExistingDocuments('aadhaar', 'Aadhaar Documents')}
                  {renderDocumentFields('aadhaar_details', 'aadhaar', 'Aadhaar', 2)}

                  {/* PAN Documents */}
                  <Divider style={{ borderTop: "2px solid #d9d9d9" }} />
                  <Divider orientation="center">PAN Document</Divider>
                  {renderExistingDocuments('pan', 'PAN Documents')}
                  {renderDocumentFields('pan_details', 'pan', 'PAN', 2)}

                  {/* Location Documents */}
                  <Divider style={{ borderTop: "2px solid #d9d9d9" }} />
                  <Divider orientation="center">Location Document</Divider>
                  {renderExistingDocuments('location_photo', 'Location Documents')}
                  {renderDocumentFields('location_details', 'location_photo', 'Location', 4)}

                  {/* Other Documents */}
                  <Divider style={{ borderTop: "2px solid #d9d9d9" }} />
                  <Divider orientation="center">Other Document</Divider>
                  {renderExistingDocuments('other', 'Other Documents')}
                  {renderDocumentFields('other_details', 'other', 'Other', 4)}

                  <Divider style={{ borderTop: "2px solid #d9d9d9" }} />

                  {/* Action Buttons */}
                  <div className="text-center mt-4" style={{ 
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '20px',
                    gap: '10px' 
                  }}>
                    <Button type="primary" size="large" onClick={onPrevious}>
                      Previous
                    </Button>
                    <Button size="large" 
                    onClick={() => {
                      navigate("/view-customer");
                    }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </Form>
            </Spin>

            {/* Preview Modal */}
            <Modal
              open={previewVisible}
              title="Document Preview"
              footer={[
                <Button key="close" onClick={() => setPreviewVisible(false)}>
                  Close
                </Button>,
                <Button 
                  key="download" 
                  type="primary"
                  onClick={() => window.open(previewContent, '_blank')}
                >
                  Open in New Tab
                </Button>
              ]}
              onCancel={() => setPreviewVisible(false)}
              width={900}
              centered
              destroyOnClose
              bodyStyle={{ padding: '16px', margin: 0 }}
              style={{ top: 20 }}
            >
              <Spin spinning={previewLoading && previewType === 'image'}>
                {previewType === 'pdf' && previewContent && (
                  <SecurePDFPreview url={previewContent} />
                )}
                
                {previewType === 'image' && previewContent && (
                  <div style={{ textAlign: 'center' }}>
                    <img 
                      src={previewContent} 
                      alt="Document Preview" 
                      style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
                      onLoad={() => setPreviewLoading(false)}
                      onError={() => {
                        setPreviewLoading(false);
                        notification.error({
                          message: 'Error',
                          description: 'Failed to load image',
                          duration: 3,
                        });
                      }}
                    />
                  </div>
                )}
              </Spin>
            </Modal>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddCustomerDocument;