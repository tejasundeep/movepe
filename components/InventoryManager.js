import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Modal, Spinner, Alert, Badge, InputGroup } from 'react-bootstrap';
import { useSession } from 'next-auth/react';

/**
 * Inventory Manager Component
 * 
 * This component provides a UI for vendors to manage their inventory.
 * 
 * @param {Object} props - Component props
 * @param {string} props.vendorId - The ID of the vendor
 */
const InventoryManager = ({ vendorId }) => {
  const { data: session } = useSession();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    quantity: '',
    unit: '',
    minQuantity: '',
    maxQuantity: '',
    cost: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState([]);

  // Fetch inventory on component mount
  useEffect(() => {
    if (session && vendorId) {
      fetchInventory();
    }
  }, [session, vendorId]);

  // Extract unique categories from inventory
  useEffect(() => {
    if (inventory.length > 0) {
      const uniqueCategories = [...new Set(inventory.map(item => item.category))].filter(Boolean);
      setCategories(uniqueCategories);
    }
  }, [inventory]);

  // Fetch inventory from the API
  const fetchInventory = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/inventory?vendorId=${vendorId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch inventory');
      }
      
      const data = await response.json();
      setInventory(data.inventory.items || []);
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError('Failed to load inventory. Please try again.');
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

  // Open modal to create a new item
  const handleCreateItem = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      category: '',
      quantity: '',
      unit: '',
      minQuantity: '',
      maxQuantity: '',
      cost: '',
    });
    setSaveError(null);
    setShowModal(true);
  };

  // Open modal to edit an existing item
  const handleEditItem = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      category: item.category || '',
      quantity: item.quantity.toString(),
      unit: item.unit || '',
      minQuantity: item.minQuantity?.toString() || '',
      maxQuantity: item.maxQuantity?.toString() || '',
      cost: item.cost?.toString() || '',
    });
    setSaveError(null);
    setShowModal(true);
  };

  // Close the modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setSaveError(null);
  };

  // Save the item
  const handleSaveItem = async () => {
    // Validate form data
    if (!formData.name.trim()) {
      setSaveError('Item name is required');
      return;
    }
    
    if (!formData.quantity.trim() || isNaN(parseInt(formData.quantity, 10))) {
      setSaveError('Quantity must be a valid number');
      return;
    }
    
    // Prepare data for API
    const itemData = {
      id: editingItem ? editingItem.id : `item_${Date.now()}`,
      name: formData.name.trim(),
      description: formData.description.trim(),
      category: formData.category.trim(),
      quantity: parseInt(formData.quantity, 10),
      unit: formData.unit.trim(),
      minQuantity: formData.minQuantity ? parseInt(formData.minQuantity, 10) : null,
      maxQuantity: formData.maxQuantity ? parseInt(formData.maxQuantity, 10) : null,
      cost: formData.cost ? parseFloat(formData.cost) : null,
      updatedAt: new Date().toISOString(),
    };
    
    setSaving(true);
    setSaveError(null);
    
    try {
      // Update inventory
      const updatedInventory = editingItem
        ? inventory.map(item => (item.id === editingItem.id ? itemData : item))
        : [...inventory, itemData];
      
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vendorId,
          items: updatedInventory,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save inventory');
      }
      
      // Update local state
      setInventory(updatedInventory);
      
      // Close modal
      handleCloseModal();
    } catch (err) {
      console.error('Error saving inventory:', err);
      setSaveError('Failed to save inventory. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Open delete confirmation modal
  const handleDeleteConfirmation = (item) => {
    setDeleteConfirmation(item);
  };

  // Close delete confirmation modal
  const handleCloseDeleteConfirmation = () => {
    setDeleteConfirmation(null);
  };

  // Delete the item
  const handleDeleteItem = async () => {
    if (!deleteConfirmation) {
      return;
    }
    
    setDeleting(true);
    
    try {
      // Remove item from inventory
      const updatedInventory = inventory.filter(item => item.id !== deleteConfirmation.id);
      
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vendorId,
          items: updatedInventory,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete inventory item');
      }
      
      // Update local state
      setInventory(updatedInventory);
      
      // Close modal
      handleCloseDeleteConfirmation();
    } catch (err) {
      console.error('Error deleting inventory item:', err);
      setError('Failed to delete inventory item. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Filter inventory items
  const filteredInventory = inventory.filter(item => {
    // Filter by category
    if (filterCategory !== 'all' && item.category !== filterCategory) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  // Get stock status badge
  const getStockStatusBadge = (item) => {
    if (item.minQuantity !== null && item.quantity <= item.minQuantity) {
      return <Badge bg="danger">Low Stock</Badge>;
    }
    
    if (item.maxQuantity !== null && item.quantity >= item.maxQuantity) {
      return <Badge bg="warning">Overstocked</Badge>;
    }
    
    return <Badge bg="success">In Stock</Badge>;
  };

  // If not authenticated or not a vendor, don't render anything
  if (!session || !vendorId) {
    return null;
  }

  return (
    <Card className="shadow-sm mb-4">
      <Card.Header className="bg-white">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Inventory Management</h5>
          <Button variant="primary" size="sm" onClick={handleCreateItem}>
            <i className="bi bi-plus-circle me-2"></i>
            Add Item
          </Button>
        </div>
      </Card.Header>
      
      <Card.Body>
        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}
        
        {/* Filters */}
        <div className="mb-4">
          <div className="row g-3">
            <div className="col-md-6">
              <InputGroup>
                <InputGroup.Text>
                  <i className="bi bi-search"></i>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </div>
            
            <div className="col-md-6">
              <Form.Select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Form.Select>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" role="status" variant="primary" />
            <p className="mt-3 text-muted">Loading inventory...</p>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="text-center py-4">
            <i className="bi bi-box text-muted" style={{ fontSize: '2rem' }}></i>
            <p className="mt-3 text-muted">No inventory items found</p>
            <p className="text-muted small">
              {inventory.length > 0
                ? 'Try changing your filters to see more items'
                : 'Add items to your inventory to get started'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <Table hover className="align-middle">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th className="text-end">Quantity</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div className="fw-bold">{item.name}</div>
                      {item.description && (
                        <div className="text-muted small">{item.description}</div>
                      )}
                    </td>
                    <td>{item.category || '-'}</td>
                    <td className="text-end">
                      {item.quantity} {item.unit || ''}
                    </td>
                    <td>{getStockStatusBadge(item)}</td>
                    <td className="text-end">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={() => handleEditItem(item)}
                      >
                        <i className="bi bi-pencil"></i>
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDeleteConfirmation(item)}
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
      
      {/* Item Form Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingItem ? 'Edit Inventory Item' : 'Add Inventory Item'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {saveError && (
            <Alert variant="danger" className="mb-4">
              {saveError}
            </Alert>
          )}
          
          <Form>
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Item Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter item name"
                    required
                  />
                </Form.Group>
              </div>
              
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Category</Form.Label>
                  <Form.Control
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    placeholder="Enter category"
                    list="categories"
                  />
                  <datalist id="categories">
                    {categories.map(category => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                </Form.Group>
              </div>
              
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Quantity</Form.Label>
                  <Form.Control
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    placeholder="Enter quantity"
                    min="0"
                    required
                  />
                </Form.Group>
              </div>
              
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Unit</Form.Label>
                  <Form.Control
                    type="text"
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    placeholder="e.g., pcs, kg, boxes"
                  />
                </Form.Group>
              </div>
              
              <div className="col-12">
                <Form.Group>
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter item description"
                    rows={2}
                  />
                </Form.Group>
              </div>
              
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>Minimum Quantity</Form.Label>
                  <Form.Control
                    type="number"
                    name="minQuantity"
                    value={formData.minQuantity}
                    onChange={handleInputChange}
                    placeholder="Low stock threshold"
                    min="0"
                  />
                  <Form.Text className="text-muted">
                    Alert when stock is below this level
                  </Form.Text>
                </Form.Group>
              </div>
              
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>Maximum Quantity</Form.Label>
                  <Form.Control
                    type="number"
                    name="maxQuantity"
                    value={formData.maxQuantity}
                    onChange={handleInputChange}
                    placeholder="Overstock threshold"
                    min="0"
                  />
                  <Form.Text className="text-muted">
                    Alert when stock exceeds this level
                  </Form.Text>
                </Form.Group>
              </div>
              
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>Cost per Unit (₹)</Form.Label>
                  <Form.Control
                    type="number"
                    name="cost"
                    value={formData.cost}
                    onChange={handleInputChange}
                    placeholder="Cost per unit"
                    min="0"
                    step="0.01"
                  />
                </Form.Group>
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
            onClick={handleSaveItem}
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
              'Save Item'
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
            Are you sure you want to delete the item "{deleteConfirmation?.name}"?
            This action cannot be undone.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDeleteConfirmation}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteItem}
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
              'Delete Item'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
};

export default InventoryManager; 