'use client'

import { useState, useEffect, useRef } from 'react'
import { Container, Row, Col, Form, Button, Alert, Card, Image } from 'react-bootstrap'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { BsCamera } from 'react-icons/bs'

export default function SettingsPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const fileInputRef = useRef(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    imageUrl: '',
    // Vendor specific fields
    companyName: '',
    serviceAreas: '',
    basePrice: '',
    description: '',
    availability: 'available'
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    const fetchUserData = async () => {
      if (!session?.user?.email) return

      try {
        const response = await fetch('/api/user/profile')
        if (!response.ok) throw new Error('Failed to fetch user data')
        
        const userData = await response.json()
        setFormData(prev => ({
          ...prev,
          ...userData,
          serviceAreas: userData.serviceAreas?.join(', ') || '',
          whatsapp: userData.whatsapp || userData.phone
        }))
      } catch (error) {
        console.error('Error fetching user data:', error)
        setError('Failed to load user data')
      }
    }

    if (sessionStatus === 'authenticated') {
      fetchUserData()
    }
  }, [session, sessionStatus])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('/api/user/upload-image', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to upload image')
      }

      const { imageUrl } = await response.json()
      setFormData(prev => ({ ...prev, imageUrl }))
      setSuccess('Profile image updated successfully')
    } catch (err) {
      setError(err.message || 'Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      // Prepare the data based on user role
      const updateData = {
        name: formData.name,
        phone: formData.phone,
        whatsapp: formData.whatsapp || formData.phone
      }

      // Add vendor-specific fields if user is a vendor
      if (session.user.role === 'vendor') {
        updateData.companyName = formData.companyName
        updateData.serviceAreas = formData.serviceAreas.split(',').map(area => area.trim())
        updateData.basePrice = Number(formData.basePrice)
        updateData.description = formData.description
        updateData.availability = formData.availability
      }

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update profile')
      }

      setSuccess('Profile updated successfully')
    } catch (err) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  if (sessionStatus === 'loading') {
    return null
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  return (
    <Container className="py-5">
      <h2 className="mb-4">Account Settings</h2>
      
      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4">{success}</Alert>}

      <Form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <Card.Body>
            <div className="text-center mb-4">
              <div 
                className="profile-image-container"
                onClick={handleImageClick}
                role="button"
                tabIndex={0}
              >
                <Image
                  src={formData.imageUrl || '/default-avatar.png'}
                  alt="Profile"
                  className="profile-image"
                  width={150}
                  height={150}
                />
                <div className="image-upload-icon">
                  <BsCamera />
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="d-none"
                accept="image/*"
                onChange={handleImageChange}
                disabled={uploadingImage}
              />
              {uploadingImage && (
                <small className="d-block mt-2 text-muted">Uploading image...</small>
              )}
            </div>

            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={formData.email}
                disabled
              />
              <Form.Text className="text-muted">
                Email cannot be changed
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Phone Number</Form.Label>
              <Form.Control
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>WhatsApp Number (Optional)</Form.Label>
              <Form.Control
                type="tel"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleChange}
                placeholder="Same as phone number if not specified"
              />
            </Form.Group>

            {session.user.role === 'vendor' && (
              <>
                <hr className="my-4" />
                <h4>Vendor Details</h4>

                <Form.Group className="mb-3">
                  <Form.Label>Company Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Service Areas (Comma separated pincodes)</Form.Label>
                  <Form.Control
                    type="text"
                    name="serviceAreas"
                    value={formData.serviceAreas}
                    onChange={handleChange}
                    placeholder="e.g., 110001, 110002, 110003"
                    required
                  />
                  <Form.Text className="text-muted">
                    Enter the pincodes where you provide service, separated by commas
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Base Price (₹)</Form.Label>
                  <Form.Control
                    type="number"
                    name="basePrice"
                    value={formData.basePrice}
                    onChange={handleChange}
                    min="0"
                    required
                  />
                  <Form.Text className="text-muted">
                    Your minimum service charge
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Tell us about your services..."
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Availability Status</Form.Label>
                  <Form.Select
                    name="availability"
                    value={formData.availability}
                    onChange={handleChange}
                  >
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                    <option value="vacation">On Vacation</option>
                  </Form.Select>
                </Form.Group>
              </>
            )}

            <div className="d-grid">
              <Button
                variant="primary"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Saving Changes...' : 'Save Changes'}
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Form>
    </Container>
  )
} 