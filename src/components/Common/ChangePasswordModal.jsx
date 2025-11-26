import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Button, message } from "antd";
import { LockOutlined, EyeInvisibleOutlined, EyeOutlined } from "@ant-design/icons";
import { POST } from "../../helpers/api_helper";

const ChangePasswordModal = ({ visible, onSave, onCancel, userId }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (visible) {
      form.resetFields();
    }
  }, [visible, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    
    try {
      const endpoint = `/api/users/change-password/`;

      const response = await POST(endpoint, {
        old_password: values.currentPassword,
        new_password: values.newPassword
      });

      console.log("FULL RESPONSE:", response);
      console.log("RESPONSE DATA:", response.data);

      // ✅ Check if response contains an error (backend returned 200 but with error object)
      if (response.data?.error) {
        message.error(response.data.error);
        return; // Don't reset form or close modal
      }

      // ✅ Success - reset form and close modal
      if (response.data?.message) {
        message.success(response.data.message);
      } else {
        message.success("Password changed successfully");
      }
      
      form.resetFields();
      onSave();

    } catch (error) {
      console.log("CAUGHT ERROR:", error);
      console.log("ERROR MESSAGE:", error.message);
      console.log("ERROR DATA:", error.data);
      console.log("ERROR STATUS:", error.status);

      // ✅ With the new API helper, error details are in error.data
      const backendErr =
        error.data?.error ||
        error.data?.message ||
        error.data?.detail ||
        error.data?.old_password?.[0] ||
        error.data?.new_password?.[0] ||
        error.data?.non_field_errors?.[0] ||
        error.message ||
        "Failed to change password";

      console.log("EXTRACTED ERROR:", backendErr);

      // ❌ Error - show message but DON'T reset form or close modal
      message.error(backendErr);

    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center" }}>
          <LockOutlined style={{ marginRight: "8px", fontSize: "18px" }} />
          Change Password
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={450}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          label="Current Password"
          name="currentPassword"
          rules={[
            { required: true, message: "Please enter your current password" }
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: "#bfbfbf" }} />}
            placeholder="Enter current password"
            iconRender={(visible) =>
              visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
            }
          />
        </Form.Item>

        <Form.Item
          label="New Password"
          name="newPassword"
          rules={[
            { required: true, message: "Please enter a new password" },
            { min: 8, message: "Password must be at least 8 characters" }
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: "#bfbfbf" }} />}
            placeholder="Enter new password (min 8 characters)"
            iconRender={(visible) =>
              visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
            }
          />
        </Form.Item>

        <Form.Item
          label="Confirm New Password"
          name="confirmPassword"
          dependencies={["newPassword"]}
          rules={[
            { required: true, message: "Please confirm your new password" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("newPassword") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error("The two passwords do not match")
                );
              }
            })
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: "#bfbfbf" }} />}
            placeholder="Confirm new password"
            iconRender={(visible) =>
              visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
            }
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Change Password
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ChangePasswordModal;
