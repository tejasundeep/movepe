import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET handler for fetching support tickets
 * @param {Request} request - The incoming request
 * @returns {Promise<NextResponse>} - The response with tickets data
 */
export async function GET(request) {
  try {
    // Get the session to check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    // Mock data for support tickets - replace with actual database query
    const mockTickets = [
      {
        id: 'ticket-001',
        subject: 'Payment not processed',
        description: 'My payment was deducted but order shows as unpaid',
        status: 'open',
        priority: 'high',
        createdAt: '2023-03-08T10:30:00Z',
        userId: 'user-123',
        userEmail: 'customer@example.com',
        category: 'payment'
      },
      {
        id: 'ticket-002',
        subject: 'Wrong delivery address',
        description: 'Need to update my delivery address for order #ORD-5678',
        status: 'open',
        priority: 'medium',
        createdAt: '2023-03-07T14:15:00Z',
        userId: 'user-456',
        userEmail: 'john.doe@example.com',
        category: 'order'
      },
      {
        id: 'ticket-003',
        subject: 'Rider was unprofessional',
        description: 'The rider was rude during delivery',
        status: 'open',
        priority: 'medium',
        createdAt: '2023-03-06T09:45:00Z',
        userId: 'user-789',
        userEmail: 'jane.smith@example.com',
        category: 'rider'
      }
    ];
    
    // Filter tickets by status if provided
    let filteredTickets = mockTickets;
    if (status) {
      filteredTickets = mockTickets.filter(ticket => ticket.status === status);
    }
    
    return NextResponse.json({ tickets: filteredTickets });
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch support tickets' },
      { status: 500 }
    );
  }
} 