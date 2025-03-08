'use client'

import { useState, useEffect } from 'react'
import { Card, Form, Button, Alert, Spinner, Row, Col, Tabs, Tab } from 'react-bootstrap'
import AdminLayout from '../../components/AdminLayout'
import { FaSave, FaCog, FaBell, FaKey, FaEnvelope, FaMobile, FaMoneyBillWave } from 'react-icons/fa'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [settings, setSettings] = useState({
    general: {
      siteName: 'Move Management System',
      contactEmail: 'support@movepe.com',
      supportPhone: '+91 9999999999',
      defaultCurrency: 'INR'
    },
    notification: {
      enableEmailNotifications: true,
      enableSmsNotifications: true,
      enableWhatsAppNotifications: true,
      adminNotificationEmail: 'admin@movepe.com'
    },
    payment: {
      razorpayKeyId: '',
      razorpayKeySecret: '',
      enableTestMode: true,
      defaultCommissionRate: 10
    },
    api: {
      googleMapsApiKey: '',
      twilioAccountSid: '',
      twilioAuthToken: '',
      sendgridApiKey: ''
    }
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/settings')
      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()
      setSettings(data)
    } catch (error) {
      console.error('Error fetching settings:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  const handleCheckboxChange = (section, field) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: !prev[section][field]
      }
    }))
  }

  const handleSubmit = async (e, section) => {
    e.preventDefault()
    
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          section, 
          settings: settings[section] 
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save settings')
      }

      setSuccess(`${section.charAt(0).toUpperCase() + section.slice(1)} settings saved successfully!`)
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null)
      }, 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading settings...</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="mb-4">
        <h2>System Settings</h2>
        <p className="text-muted">Configure system-wide settings for the Move Management System</p>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Tabs defaultActiveKey="general" className="mb-4">
            {/* General Settings */}
            <Tab eventKey="general" title={<span><FaCog className="me-2" /> General</span>}>
              <Form onSubmit={(e) => handleSubmit(e, 'general')}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Site Name</Form.Label>
                      <Form.Control
                        type="text"
                        value={settings.general.siteName}
                        onChange={(e) => handleInputChange('general', 'siteName', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Default Currency</Form.Label>
                      <Form.Select
                        value={settings.general.defaultCurrency}
                        onChange={(e) => handleInputChange('general', 'defaultCurrency', e.target.value)}
                      >
                        <option value="INR">Indian Rupee (₹)</option>
                        <option value="USD">US Dollar ($)</option>
                        <option value="EUR">Euro (€)</option>
                        <option value="GBP">British Pound (£)</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Contact Email</Form.Label>
                      <InputWithIcon 
                        icon={<FaEnvelope />}
                        type="email"
                        value={settings.general.contactEmail}
                        onChange={(e) => handleInputChange('general', 'contactEmail', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Support Phone</Form.Label>
                      <InputWithIcon 
                        icon={<FaMobile />}
                        type="text"
                        value={settings.general.supportPhone}
                        onChange={(e) => handleInputChange('general', 'supportPhone', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <div className="d-flex justify-content-end">
                  <Button 
                    type="submit" 
                    variant="primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" className="me-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <FaSave className="me-2" /> Save General Settings
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Tab>

            {/* Notification Settings */}
            <Tab eventKey="notification" title={<span><FaBell className="me-2" /> Notifications</span>}>
              <Form onSubmit={(e) => handleSubmit(e, 'notification')}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Check 
                        type="switch"
                        id="enable-email"
                        label="Enable Email Notifications"
                        checked={settings.notification.enableEmailNotifications}
                        onChange={() => handleCheckboxChange('notification', 'enableEmailNotifications')}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Check 
                        type="switch"
                        id="enable-sms"
                        label="Enable SMS Notifications"
                        checked={settings.notification.enableSmsNotifications}
                        onChange={() => handleCheckboxChange('notification', 'enableSmsNotifications')}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Check 
                        type="switch"
                        id="enable-whatsapp"
                        label="Enable WhatsApp Notifications"
                        checked={settings.notification.enableWhatsAppNotifications}
                        onChange={() => handleCheckboxChange('notification', 'enableWhatsAppNotifications')}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Admin Notification Email</Form.Label>
                      <InputWithIcon 
                        icon={<FaEnvelope />}
                        type="email"
                        value={settings.notification.adminNotificationEmail}
                        onChange={(e) => handleInputChange('notification', 'adminNotificationEmail', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <div className="d-flex justify-content-end">
                  <Button 
                    type="submit" 
                    variant="primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" className="me-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <FaSave className="me-2" /> Save Notification Settings
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Tab>

            {/* Payment Settings */}
            <Tab eventKey="payment" title={<span><FaMoneyBillWave className="me-2" /> Payment</span>}>
              <Form onSubmit={(e) => handleSubmit(e, 'payment')}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Razorpay Key ID</Form.Label>
                      <InputWithIcon 
                        icon={<FaKey />}
                        type="text"
                        value={settings.payment.razorpayKeyId}
                        onChange={(e) => handleInputChange('payment', 'razorpayKeyId', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Razorpay Key Secret</Form.Label>
                      <InputWithIcon 
                        icon={<FaKey />}
                        type="password"
                        value={settings.payment.razorpayKeySecret}
                        onChange={(e) => handleInputChange('payment', 'razorpayKeySecret', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Check 
                        type="switch"
                        id="enable-test-mode"
                        label="Enable Test Mode"
                        checked={settings.payment.enableTestMode}
                        onChange={() => handleCheckboxChange('payment', 'enableTestMode')}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Default Commission Rate (%)</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        max="100"
                        value={settings.payment.defaultCommissionRate}
                        onChange={(e) => handleInputChange('payment', 'defaultCommissionRate', parseInt(e.target.value))}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <div className="d-flex justify-content-end">
                  <Button 
                    type="submit" 
                    variant="primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" className="me-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <FaSave className="me-2" /> Save Payment Settings
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Tab>

            {/* API Settings */}
            <Tab eventKey="api" title={<span><FaKey className="me-2" /> API Keys</span>}>
              <Form onSubmit={(e) => handleSubmit(e, 'api')}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Google Maps API Key</Form.Label>
                      <InputWithIcon 
                        icon={<FaKey />}
                        type="password"
                        value={settings.api.googleMapsApiKey}
                        onChange={(e) => handleInputChange('api', 'googleMapsApiKey', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>SendGrid API Key</Form.Label>
                      <InputWithIcon 
                        icon={<FaKey />}
                        type="password"
                        value={settings.api.sendgridApiKey}
                        onChange={(e) => handleInputChange('api', 'sendgridApiKey', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Twilio Account SID</Form.Label>
                      <InputWithIcon 
                        icon={<FaKey />}
                        type="password"
                        value={settings.api.twilioAccountSid}
                        onChange={(e) => handleInputChange('api', 'twilioAccountSid', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Twilio Auth Token</Form.Label>
                      <InputWithIcon 
                        icon={<FaKey />}
                        type="password"
                        value={settings.api.twilioAuthToken}
                        onChange={(e) => handleInputChange('api', 'twilioAuthToken', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <div className="d-flex justify-content-end">
                  <Button 
                    type="submit" 
                    variant="primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" className="me-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <FaSave className="me-2" /> Save API Settings
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>
    </AdminLayout>
  )
}

// Helper component for input with icon
const InputWithIcon = ({ icon, ...props }) => {
  return (
    <div className="input-group">
      <span className="input-group-text bg-light">
        {icon}
      </span>
      <Form.Control {...props} />
    </div>
  )
} 