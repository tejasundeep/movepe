import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Form, Modal, Spinner, Alert } from 'react-bootstrap';
import { useSession } from 'next-auth/react';

/**
 * Quote Template Manager Component
 * 
 * This component allows vendors to manage their quote templates.
 * 
 * @param {Object} props - Component props
 * @param {string} props.vendorId - The ID of the vendor
 */
const QuoteTemplateManager = ({ vendorId }) => {
  const { data: session } = useSession();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    baseAmount: '',
    details: {
      laborCost: '',
      materialCost: '',
      transportationCost: '',
      packagingCost: '',
      additionalCosts: [],
      discounts: [],
    },
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch templates on component mount
  useEffect(() => {
    if (session && vendorId) {
      fetchTemplates();
    }
  }, [session, vendorId]);

  // Fetch templates from the API
  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/quotes/templates?vendorId=${vendorId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch quote templates');
      }
      
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      console.error('Error fetching quote templates:', err);
      setError('Failed to load quote templates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Handle details input change
  const handleDetailsChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      details: {
        ...prevData.details,
        [name]: value,
      },
    }));
  };

  // Handle additional cost input change
  const handleAdditionalCostChange = (index, field, value) => {
    setFormData(prevData => {
      const additionalCosts = [...prevData.details.additionalCosts];
      additionalCosts[index] = {
        ...additionalCosts[index],
        [field]: value,
      };
      
      return {
        ...prevData,
        details: {
          ...prevData.details,
          additionalCosts,
        },
      };
    });
  };

  // Add a new additional cost
  const addAdditionalCost = () => {
    setFormData(prevData => ({
      ...prevData,
      details: {
        ...prevData.details,
        additionalCosts: [
          ...prevData.details.additionalCosts,
          { name: '', amount: '' },
        ],
      },
    }));
  };

  // Remove an additional cost
  const removeAdditionalCost = (index) => {
    setFormData(prevData => {
      const additionalCosts = [...prevData.details.additionalCosts];
      additionalCosts.splice(index, 1);
      
      return {
        ...prevData,
        details: {
          ...prevData.details,
          additionalCosts,
        },
      };
    });
  };

  // Handle discount input change
  const handleDiscountChange = (index, field, value) => {
    setFormData(prevData => {
      const discounts = [...prevData.details.discounts];
      discounts[index] = {
        ...discounts[index],
        [field]: value,
      };
      
      return {
        ...prevData,
        details: {
          ...prevData.details,
          discounts,
        },
      };
    });
  };

  // Add a new discount
  const addDiscount = () => {
    setFormData(prevData => ({
      ...prevData,
      details: {
        ...prevData.details,
        discounts: [
          ...prevData.details.discounts,
          { name: '', amount: '' },
        ],
      },
    }));
  };

  // Remove a discount
  const removeDiscount = (index) => {
    setFormData(prevData => {
      const discounts = [...prevData.details.discounts];
      discounts.splice(index, 1);
      
      return {
        ...prevData,
        details: {
          ...prevData.details,
          discounts,
        },
      };
    });
  };

  // Calculate total amount
  const calculateTotal = () => {
    const baseAmount = parseFloat(formData.baseAmount) || 0;
    const laborCost = parseFloat(formData.details.laborCost) || 0;
    const materialCost = parseFloat(formData.details.materialCost) || 0;
    const transportationCost = parseFloat(formData.details.transportationCost) || 0;
    const packagingCost = parseFloat(formData.details.packagingCost) || 0;
    
    const additionalCostsTotal = formData.details.additionalCosts.reduce(
      (total, cost) => total + (parseFloat(cost.amount) || 0),
      0
    );
    
    const discountsTotal = formData.details.discounts.reduce(
      (total, discount) => total + (parseFloat(discount.amount) || 0),
      0
    );
    
    return baseAmount + laborCost + materialCost + transportationCost + packagingCost + additionalCostsTotal - discountsTotal;
  };

  // Open modal to create a new template
  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      description: '',
      baseAmount: '',
      details: {
        laborCost: '',
        materialCost: '',
        transportationCost: '',
        packagingCost: '',
        additionalCosts: [],
        discounts: [],
      },
    });
    setSaveError(null);
    setShowModal(true);
  };

  // Open modal to edit an existing template
  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      baseAmount: template.baseAmount.toString(),
      details: {
        laborCost: template.details.laborCost?.toString() || '',
        materialCost: template.details.materialCost?.toString() || '',
        transportationCost: template.details.transportationCost?.toString() || '',
        packagingCost: template.details.packagingCost?.toString() || '',
        additionalCosts: template.details.additionalCosts?.map(cost => ({
          name: cost.name,
          amount: cost.amount.toString(),
        })) || [],
        discounts: template.details.discounts?.map(discount => ({
          name: discount.name,
          amount: discount.amount.toString(),
        })) || [],
      },
    });
    setSaveError(null);
    setShowModal(true);
  };

  // Close the modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
    setSaveError(null);
  };

  // Save the template
  const handleSaveTemplate = async () => {
    // Validate form data
    if (!formData.name.trim()) {
      setSaveError('Template name is required');
      return;
    }
    
    if (!formData.baseAmount.trim() || isNaN(parseFloat(formData.baseAmount))) {
      setSaveError('Base amount must be a valid number');
      return;
    }
    
    // Prepare data for API
    const templateData = {
      vendorId,
      name: formData.name.trim(),
      description: formData.description.trim(),
      baseAmount: parseFloat(formData.baseAmount),
      details: {
        laborCost: parseFloat(formData.details.laborCost) || 0,
        materialCost: parseFloat(formData.details.materialCost) || 0,
        transportationCost: parseFloat(formData.details.transportationCost) || 0,
        packagingCost: parseFloat(formData.details.packagingCost) || 0,
        additionalCosts: formData.details.additionalCosts
          .filter(cost => cost.name.trim() && !isNaN(parseFloat(cost.amount)))
          .map(cost => ({
            name: cost.name.trim(),
            amount: parseFloat(cost.amount),
          })),
        discounts: formData.details.discounts
          .filter(discount => discount.name.trim() && !isNaN(parseFloat(discount.amount)))
          .map(discount => ({
            name: discount.name.trim(),
            amount: parseFloat(discount.amount),
          })),
      },
    };
    
    setSaving(true);
    setSaveError(null);
    
    try {
      let response;
      
      if (editingTemplate) {
        // Update existing template
        response = await fetch(`/api/quotes/templates/${editingTemplate.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(templateData),
        });
      } else {
        // Create new template
        response = await fetch('/api/quotes/templates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(templateData),
        });
      }
      
      if (!response.ok) {
        throw new Error('Failed to save quote template');
      }
      
      // Refresh templates
      await fetchTemplates();
      
      // Close modal
      handleCloseModal();
    } catch (err) {
      console.error('Error saving quote template:', err);
      setSaveError('Failed to save quote template. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Open delete confirmation modal
  const handleDeleteConfirmation = (template) => {
    setDeleteConfirmation(template);
  };

  // Close delete confirmation modal
  const handleCloseDeleteConfirmation = () => {
    setDeleteConfirmation(null);
  };

  // Delete the template
  const handleDeleteTemplate = async () => {
    if (!deleteConfirmation) {
      return;
    }
    
    setDeleting(true);
    
    try {
      const response = await fetch(`/api/quotes/templates/${deleteConfirmation.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete quote template');
      }
      
      // Refresh templates
      await fetchTemplates();
      
      // Close modal
      handleCloseDeleteConfirmation();
    } catch (err) {
      console.error('Error deleting quote template:', err);
      setError('Failed to delete quote template. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // If not authenticated or not a vendor, don't render anything
  if (!session || !vendorId) {
    return null;
  }

  return (
    <Card className="shadow-sm mb-4">
      <Card.Header className="bg-white">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Quote Templates</h5>
          <Button variant="primary" size="sm" onClick={handleCreateTemplate}>
            <i className="bi bi-plus-circle me-2"></i>
            Create Template
          </Button>
        </div>
      </Card.Header>
      
      <Card.Body>
        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}
        
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" role="status" variant="primary" />
            <p className="mt-3 text-muted">Loading quote templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-4">
            <i className="bi bi-file-earmark-text text-muted" style={{ fontSize: '2rem' }}></i>
            <p className="mt-3 text-muted">No quote templates found</p>
            <p className="text-muted small">
              Create templates to quickly generate quotes for common move types.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <Table hover className="align-middle">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th className="text-end">Base Amount</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(template => (
                  <tr key={template.id}>
                    <td>{template.name}</td>
                    <td>
                      {template.description ? (
                        template.description
                      ) : (
                        <span className="text-muted fst-italic">No description</span>
                      )}
                    </td>
                    <td className="text-end">₹{template.baseAmount.toFixed(2)}</td>
                    <td className="text-end">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={() => handleEditTemplate(template)}
                      >
                        <i className="bi bi-pencil"></i>
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDeleteConfirmation(template)}
                      >
                        <i className="bi bi-trash"></i>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>
      
      {/* Template Form Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingTemplate ? 'Edit Quote Template' : 'Create Quote Template'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {saveError && (
            <Alert variant="danger" className="mb-4">
              {saveError}
            </Alert>
          )}
          
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Template Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Standard 2BHK Move"
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe what this template is for"
                rows={2}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Base Amount (₹)</Form.Label>
              <Form.Control
                type="number"
                name="baseAmount"
                value={formData.baseAmount}
                onChange={handleInputChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
              <Form.Text className="text-muted">
                The starting price for this type of move
              </Form.Text>
            </Form.Group>
            
            <hr className="my-4" />
            
            <h6>Cost Breakdown</h6>
            <p className="text-muted small mb-3">
              Break down the costs to provide transparency to customers
            </p>
            
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Labor Cost (₹)</Form.Label>
                  <Form.Control
                    type="number"
                    name="laborCost"
                    value={formData.details.laborCost}
                    onChange={handleDetailsChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </Form.Group>
              </div>
              
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Material Cost (₹)</Form.Label>
                  <Form.Control
                    type="number"
                    name="materialCost"
                    value={formData.details.materialCost}
                    onChange={handleDetailsChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </Form.Group>
              </div>
              
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Transportation Cost (₹)</Form.Label>
                  <Form.Control
                    type="number"
                    name="transportationCost"
                    value={formData.details.transportationCost}
                    onChange={handleDetailsChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </Form.Group>
              </div>
              
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Packaging Cost (₹)</Form.Label>
                  <Form.Control
                    type="number"
                    name="packagingCost"
                    value={formData.details.packagingCost}
                    onChange={handleDetailsChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </Form.Group>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <Form.Label className="mb-0">Additional Costs</Form.Label>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={addAdditionalCost}
                >
                  <i className="bi bi-plus-circle me-1"></i>
                  Add Cost
                </Button>
              </div>
              
              {formData.details.additionalCosts.map((cost, index) => (
                <div key={index} className="d-flex gap-2 mb-2">
                  <Form.Control
                    type="text"
                    placeholder="Cost name"
                    value={cost.name}
                    onChange={(e) => handleAdditionalCostChange(index, 'name', e.target.value)}
                  />
                  <Form.Control
                    type="number"
                    placeholder="Amount"
                    value={cost.amount}
                    onChange={(e) => handleAdditionalCostChange(index, 'amount', e.target.value)}
                    min="0"
                    step="0.01"
                  />
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => removeAdditionalCost(index)}
                  >
                    <i className="bi bi-trash"></i>
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <Form.Label className="mb-0">Discounts</Form.Label>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={addDiscount}
                >
                  <i className="bi bi-plus-circle me-1"></i>
                  Add Discount
                </Button>
              </div>
              
              {formData.details.discounts.map((discount, index) => (
                <div key={index} className="d-flex gap-2 mb-2">
                  <Form.Control
                    type="text"
                    placeholder="Discount name"
                    value={discount.name}
                    onChange={(e) => handleDiscountChange(index, 'name', e.target.value)}
                  />
                  <Form.Control
                    type="number"
                    placeholder="Amount"
                    value={discount.amount}
                    onChange={(e) => handleDiscountChange(index, 'amount', e.target.value)}
                    min="0"
                    step="0.01"
                  />
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => removeDiscount(index)}
                  >
                    <i className="bi bi-trash"></i>
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="bg-light p-3 rounded mb-3">
              <div className="d-flex justify-content-between">
                <span className="fw-bold">Total Amount:</span>
                <span className="fw-bold">₹{calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveTemplate}
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
              'Save Template'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal show={!!deleteConfirmation} onHide={handleCloseDeleteConfirmation}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Are you sure you want to delete the template "{deleteConfirmation?.name}"?
            This action cannot be undone.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDeleteConfirmation}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteTemplate}
            disabled={deleting}
          >
            {deleting ? (
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
              'Delete Template'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
};

export default QuoteTemplateManager; 