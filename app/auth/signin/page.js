'use client'

import { useState, useEffect, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap'
import { FcGoogle } from 'react-icons/fc'
import Link from 'next/link'

function SignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  useEffect(() => {
    // Show success message if redirected from registration
    if (searchParams.get('registered') === 'true') {
      setSuccess('Registration successful! Please sign in with your credentials.')
    }
    // Show error message if there's an error in the URL
    const errorMessage = searchParams.get('error')
    if (errorMessage) {
      switch (errorMessage) {
        case 'CredentialsSignin':
          setError('Invalid email or password')
          break
        case 'OAuthSignin':
          setError('Error signing in with Google')
          break
        default:
          setError('An error occurred during sign in')
      }
    }
  }, [searchParams])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear errors when user starts typing
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: formData.email,
        password: formData.password
      })

      if (result.error) {
        setError('Invalid email or password')
      } else {
        // Get return URL from query parameters or default to dashboard
        const returnUrl = searchParams.get('callbackUrl') || '/dashboard'
        router.push(returnUrl)
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/dashboard' })
  }

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={6}>
          <div className="text-center mb-4">
            <h2>Sign In</h2>
            <p>Welcome back! Please sign in to continue.</p>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Email address</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
                autoComplete="email"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </Form.Group>

            <Button
              variant="primary"
              type="submit"
              className="w-100 mb-3"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            <div className="text-center mb-3">
              <small>Or continue with</small>
            </div>

            <Button
              variant="outline-dark"
              className="w-100 mb-3"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <FcGoogle className="me-2" />
              Sign in with Google
            </Button>

            <div className="text-center">
              <p>
                Don't have an account?{' '}
                <Link href="/auth/register">Register as User</Link>
                {' or '}
                <Link href="/auth/register/vendor">Register as Vendor</Link>
              </p>
            </div>
          </Form>
        </Col>
      </Row>
    </Container>
  )
}

export default function SignIn() {
  return (
    <Suspense fallback={
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={6} className="text-center">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </Col>
        </Row>
      </Container>
    }>
      <SignInContent />
    </Suspense>
  )
} 