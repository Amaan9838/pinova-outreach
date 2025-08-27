import dbConnect from '../../../../lib/mongodb.js';
import Prospect from '../../../../models/Prospect.js';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    const prospect = await Prospect.findById(params.id);
    if (!prospect) {
      return Response.json(
        { success: false, error: 'Prospect not found' },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      prospect
    });

  } catch (error) {
    console.error('Get prospect error:', error);
    return Response.json(
      { success: false, error: 'Failed to fetch prospect' },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    
    const data = await request.json();
    
    // Handle both simple status updates and full prospect updates
    const updateData = data.status ? { status: data.status } : { ...data, updatedAt: new Date() };
    
    const prospect = await Prospect.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!prospect) {
      return Response.json(
        { success: false, error: 'Prospect not found' },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      prospect
    });

  } catch (error) {
    console.error('Update prospect error:', error);
    return Response.json(
      { success: false, error: error.message || 'Failed to update prospect' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    
    const prospect = await Prospect.findByIdAndDelete(params.id);
    
    if (!prospect) {
      return Response.json(
        { success: false, error: 'Prospect not found' },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: 'Prospect deleted successfully'
    });

  } catch (error) {
    console.error('Delete prospect error:', error);
    return Response.json(
      { success: false, error: 'Failed to delete prospect' },
      { status: 500 }
    );
  }
}
