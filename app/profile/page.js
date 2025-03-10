'use client';

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Tabs, Tab, Spinner, Modal } from 'react-bootstrap';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

/**
 * User Profile Management Page
 * 
 * Allows users to view and update their profile information, preferences, and settings.
 */
const ProfilePage = () => {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  
  // User profile data
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    profileImage: null,
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    emailNotifications: true,
    smsNotifications: true,
    whatsappNotifications: true,
    marketingEmails: true,
    language: 'english',
    currency: 'inr',
    theme: 'light'
  });

  // Fetch user profile data
  useEffect(() => {
    if (status === 'authenticated') {
      fetchUserProfile();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users/profile');
      if (!response.ok) {
        throw new Error('Failed to fetch profile data');
      }
      
      const data = await response.json();
      
      // Update profile data with fetched values
      setProfileData(prev => ({
        ...prev,
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        pincode: data.pincode || '',
        profileImage: data.profileImage || null,
        emailNotifications: data.preferences?.emailNotifications ?? true,
        smsNotifications: data.preferences?.smsNotifications ?? true,
        whatsappNotifications: data.preferences?.whatsappNotifications ?? true,
        marketingEmails: data.preferences?.marketingEmails ?? true,
        language: data.preferences?.language || 'english',
        currency: data.preferences?.currency || 'inr',
        theme: data.preferences?.theme || 'light'
      }));
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle checkbox inputs differently
    const inputValue = type === 'checkbox' ? checked : value;
    
    setProfileData(prev => ({
      ...prev,
      [name]: inputValue
    }));
  };

  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileData(prev => ({
        ...prev,
        profileImage: file
      }));
    }
  };

  const handlePersonalInfoSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('name', profileData.name);
      formData.append('phone', profileData.phone);
      formData.append('address', profileData.address);
      formData.append('city', profileData.city);
      formData.append('state', profileData.state);
      formData.append('pincode', profileData.pincode);
      
      if (profileData.profileImage && profileData.profileImage instanceof File) {
        formData.append('profileImage', profileData.profileImage);
      }

      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const result = await response.json();
      
      // Update session data with new name if changed
      if (session.user.name !== profileData.name) {
        await update({
          ...session,
          user: {
            ...session.user,
            name: profileData.name
          }
        });
      }
      
      setSuccess('Personal information updated successfully.');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate passwords
      if (profileData.newPassword !== profileData.confirmPassword) {
        throw new Error('New passwords do not match');
      }

      if (profileData.newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters long');
      }

      const response = await fetch('/api/users/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          oldPassword: profileData.oldPassword,
          newPassword: profileData.newPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update password');
      }

      // Reset password fields
      setProfileData(prev => ({
        ...prev,
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      
      setSuccess('Password updated successfully.');
    } catch (err) {
      console.error('Error updating password:', err);
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePreferencesSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const preferences = {
        emailNotifications: profileData.emailNotifications,
        smsNotifications: profileData.smsNotifications,
        whatsappNotifications: profileData.whatsappNotifications,
        marketingEmails: profileData.marketingEmails,
        language: profileData.language,
        currency: profileData.currency,
        theme: profileData.theme
      };

      const response = await fetch('/api/users/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update preferences');
      }
      
      setSuccess('Preferences updated successfully.');
    } catch (err) {
      console.error('Error updating preferences:', err);
      setError(err.message || 'Failed to update preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== session?.user?.email) {
      setError('Email confirmation does not match your email address.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/users/profile', {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account');
      }

      // Sign out and redirect to home page
      router.push('/');
      window.location.href = '/';
    } catch (err) {
      console.error('Error deleting account:', err);
      setError(err.message || 'Failed to delete account. Please try again.');
      setSaving(false);
    }
  };

  // Loading state
  if (loading || status === 'loading') {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status" variant="primary" />
        <p className="mt-3">Loading your profile...</p>
      </Container>
    );
  }

  // Not authenticated
  if (status === 'unauthenticated') {
    return (
      <Container className="py-5 text-center">
        <Alert variant="warning">
          <Alert.Heading>Authentication Required</Alert.Heading>
          <p>Please sign in to access your profile.</p>
          <div className="d-grid gap-2 d-sm-flex justify-content-sm-center">
            <Button variant="primary" href="/login">
              Sign In
            </Button>
            <Button variant="outline-secondary" href="/register">
              Register
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <h1 className="mb-4">Profile Management</h1>
      
      {error && (
        <Alert variant="danger" className="mb-4" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success" className="mb-4" dismissible onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      
      <Row>
        <Col lg={3} className="mb-4">
          <Card className="border-0 shadow-sm text-center">
            <Card.Body>
              <div className="mb-3">
                {profileData.profileImage ? (
                  <Image
                    src={profileData.profileImage instanceof File 
                      ? URL.createObjectURL(profileData.profileImage) 
                      : profileData.profileImage}
                    alt="Profile"
                    width={100}
                    height={100}
                    className="rounded-circle"
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <div 
                    className="d-flex align-items-center justify-content-center bg-primary text-white rounded-circle mx-auto"
                    style={{ width: '100px', height: '100px', fontSize: '40px' }}
                  >
                    {profileData.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <h5 className="mb-1">{profileData.name}</h5>
              <p className="text-muted mb-3">{session?.user?.role || 'User'}</p>
              <div className="d-grid">
                <label htmlFor="profile-image-upload" className="btn btn-outline-primary">
                  Change Photo
                </label>
                <input
                  id="profile-image-upload"
                  type="file"
                  accept="image/*"
                  className="d-none"
                  onChange={handleProfileImageChange}
                />
              </div>
            </Card.Body>
          </Card>
          
          <div className="list-group mt-4 border-0 shadow-sm">
            <button
              className={`list-group-item list-group-item-action ${activeTab === 'personal' ? 'active' : ''}`}
              onClick={() => setActiveTab('personal')}
            >
              <i className="bi bi-person me-2"></i>
              Personal Information
            </button>
            <button
              className={`list-group-item list-group-item-action ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <i className="bi bi-shield-lock me-2"></i>
              Security
            </button>
            <button
              className={`list-group-item list-group-item-action ${activeTab === 'preferences' ? 'active' : ''}`}
              onClick={() => setActiveTab('preferences')}
            >
              <i className="bi bi-gear me-2"></i>
              Preferences
            </button>
            <button
              className={`list-group-item list-group-item-action ${activeTab === 'account' ? 'active' : ''}`}
              onClick={() => setActiveTab('account')}
            >
              <i className="bi bi-exclamation-triangle me-2"></i>
              Account Actions
            </button>
          </div>
        </Col>
        
        <Col lg={9}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              {activeTab === 'personal' && (
                <>
                  <h4 className="mb-4">Personal Information</h4>
                  <Form onSubmit={handlePersonalInfoSubmit}>
                    <Row className="mb-3">
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Full Name</Form.Label>
                          <Form.Control
                            type="text"
                            name="name"
                            value={profileData.name}
                            onChange={handleInputChange}
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Email Address</Form.Label>
                          <Form.Control
                            type="email"
                            value={profileData.email}
                            disabled
                            readOnly
                          />
                          <Form.Text className="text-muted">
                            Email address cannot be changed.
                          </Form.Text>
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <Row className="mb-3">
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Phone Number</Form.Label>
                          <Form.Control
                            type="tel"
                            name="phone"
                            value={profileData.phone}
                            onChange={handleInputChange}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Pincode</Form.Label>
                          <Form.Control
                            type="text"
                            name="pincode"
                            value={profileData.pincode}
                            onChange={handleInputChange}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Address</Form.Label>
                      <Form.Control
                        type="text"
                        name="address"
                        value={profileData.address}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                    
                    <Row className="mb-4">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>City</Form.Label>
                          <Form.Control
                            type="text"
                            name="city"
                            value={profileData.city}
                            onChange={handleInputChange}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>State</Form.Label>
                          <Form.Control
                            type="text"
                            name="state"
                            value={profileData.state}
                            onChange={handleInputChange}
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
                            <Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              role="status"
                              aria-hidden="true"
                              className="me-2"
                            />
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </Button>
                    </div>
                  </Form>
                </>
              )}
              
              {activeTab === 'security' && (
                <>
                  <h4 className="mb-4">Security Settings</h4>
                  <Form onSubmit={handlePasswordSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label>Current Password</Form.Label>
                      <Form.Control
                        type="password"
                        name="oldPassword"
                        value={profileData.oldPassword}
                        onChange={handleInputChange}
                        required
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>New Password</Form.Label>
                      <Form.Control
                        type="password"
                        name="newPassword"
                        value={profileData.newPassword}
                        onChange={handleInputChange}
                        required
                        minLength={8}
                      />
                      <Form.Text className="text-muted">
                        Password must be at least 8 characters long.
                      </Form.Text>
                    </Form.Group>
                    
                    <Form.Group className="mb-4">
                      <Form.Label>Confirm New Password</Form.Label>
                      <Form.Control
                        type="password"
                        name="confirmPassword"
                        value={profileData.confirmPassword}
                        onChange={handleInputChange}
                        required
                      />
                    </Form.Group>
                    
                    <div className="d-flex justify-content-end">
                      <Button 
                        type="submit" 
                        variant="primary"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              role="status"
                              aria-hidden="true"
                              className="me-2"
                            />
                            Updating...
                          </>
                        ) : (
                          'Update Password'
                        )}
                      </Button>
                    </div>
                  </Form>
                  
                  <hr className="my-4" />
                  
                  <h5 className="mb-3">Two-Factor Authentication</h5>
                  <p className="text-muted">
                    Enhance your account security by enabling two-factor authentication.
                  </p>
                  
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                      <span className="badge bg-warning me-2">Not Enabled</span>
                      <span className="text-muted">Two-factor authentication is not enabled.</span>
                    </div>
                    <Button variant="outline-primary" size="sm">
                      Enable 2FA
                    </Button>
                  </div>
                  
                  <h5 className="mb-3">Login History</h5>
                  <p className="text-muted">
                    Review your recent login activity.
                  </p>
                  
                  <div className="list-group mb-3">
                    <div className="list-group-item">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-bold">Current Session</div>
                          <div className="text-muted">
                            <small>
                              <i className="bi bi-geo-alt me-1"></i>
                              Mumbai, India
                            </small>
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="text-muted small">
                            {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                          </div>
                          <div>
                            <span className="badge bg-success">Active</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              {activeTab === 'preferences' && (
                <>
                  <h4 className="mb-4">Preferences</h4>
                  <Form onSubmit={handlePreferencesSubmit}>
                    <h5 className="mb-3">Notification Preferences</h5>
                    
                    <Form.Group className="mb-3">
                      <Form.Check
                        type="checkbox"
                        id="email-notifications"
                        label="Email Notifications"
                        name="emailNotifications"
                        checked={profileData.emailNotifications}
                        onChange={handleInputChange}
                      />
                      <Form.Text className="text-muted">
                        Receive order updates and important notifications via email.
                      </Form.Text>
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Check
                        type="checkbox"
                        id="sms-notifications"
                        label="SMS Notifications"
                        name="smsNotifications"
                        checked={profileData.smsNotifications}
                        onChange={handleInputChange}
                      />
                      <Form.Text className="text-muted">
                        Receive order updates and important notifications via SMS.
                      </Form.Text>
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Check
                        type="checkbox"
                        id="whatsapp-notifications"
                        label="WhatsApp Notifications"
                        name="whatsappNotifications"
                        checked={profileData.whatsappNotifications}
                        onChange={handleInputChange}
                      />
                      <Form.Text className="text-muted">
                        Receive order updates and important notifications via WhatsApp.
                      </Form.Text>
                    </Form.Group>
                    
                    <Form.Group className="mb-4">
                      <Form.Check
                        type="checkbox"
                        id="marketing-emails"
                        label="Marketing Emails"
                        name="marketingEmails"
                        checked={profileData.marketingEmails}
                        onChange={handleInputChange}
                      />
                      <Form.Text className="text-muted">
                        Receive promotional offers, newsletters, and updates about new features.
                      </Form.Text>
                    </Form.Group>
                    
                    <h5 className="mb-3">Display Preferences</h5>
                    
                    <Row className="mb-4">
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Language</Form.Label>
                          <Form.Select
                            name="language"
                            value={profileData.language}
                            onChange={handleInputChange}
                          >
                            <option value="english">English</option>
                            <option value="hindi">Hindi</option>
                            <option value="marathi">Marathi</option>
                            <option value="tamil">Tamil</option>
                            <option value="telugu">Telugu</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Currency</Form.Label>
                          <Form.Select
                            name="currency"
                            value={profileData.currency}
                            onChange={handleInputChange}
                            disabled
                          >
                            <option value="inr">Indian Rupee (₹)</option>
                          </Form.Select>
                          <Form.Text className="text-muted">
                            Currently only INR is supported.
                          </Form.Text>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Theme</Form.Label>
                          <Form.Select
                            name="theme"
                            value={profileData.theme}
                            onChange={handleInputChange}
                          >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                            <option value="system">System Default</option>
                          </Form.Select>
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
                            <Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              role="status"
                              aria-hidden="true"
                              className="me-2"
                            />
                            Saving...
                          </>
                        ) : (
                          'Save Preferences'
                        )}
                      </Button>
                    </div>
                  </Form>
                </>
              )}
              
              {activeTab === 'account' && (
                <>
                  <h4 className="mb-4">Account Actions</h4>
                  
                  <Card className="border-danger mb-4">
                    <Card.Header className="bg-danger text-white">
                      <h5 className="mb-0">Danger Zone</h5>
                    </Card.Header>
                    <Card.Body>
                      <h6>Delete Account</h6>
                      <p className="text-muted">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      
                      <div className="d-grid">
                        <Button
                          variant="outline-danger"
                          onClick={() => setShowDeleteModal(true)}
                        >
                          Delete Account
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                  
                  <Card className="border-warning">
                    <Card.Header className="bg-warning text-dark">
                      <h5 className="mb-0">Data Export</h5>
                    </Card.Header>
                    <Card.Body>
                      <h6>Export Your Data</h6>
                      <p className="text-muted">
                        Download a copy of all your personal data in a machine-readable format.
                      </p>
                      
                      <div className="d-grid">
                        <Button variant="outline-warning">
                          Request Data Export
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Delete Account Confirmation Modal */}
      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="text-danger">Delete Account</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="danger">
            <Alert.Heading>Warning: This action cannot be undone</Alert.Heading>
            <p>
              Deleting your account will permanently remove all your data from our system, including:
            </p>
            <ul>
              <li>Personal information</li>
              <li>Order history</li>
              <li>Reviews and ratings</li>
              <li>Payment information</li>
            </ul>
            <p>
              This action cannot be reversed. Please proceed with caution.
            </p>
          </Alert>
          
          <Form.Group className="mb-3">
            <Form.Label>Confirm by typing your email address: <strong>{session?.user?.email}</strong></Form.Label>
            <Form.Control
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="Enter your email address"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteAccount}
            disabled={deleteConfirmation !== session?.user?.email || saving}
          >
            {saving ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Deleting...
              </>
            ) : (
              'Permanently Delete Account'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ProfilePage; 