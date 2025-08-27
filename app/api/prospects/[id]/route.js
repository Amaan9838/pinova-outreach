import dbConnect from '../../../../lib/mongodb.js';
import Prospect from '../../../../models/Prospect.js';

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    const { status } = await request.json();
    
    const prospect = await Prospect.findById(id);
    if (!prospect) {
      return Response.json(
        { success: false, error: 'Prospect not found' },
        { status: 404 }
      );
    }

    // Update prospect status
    prospect.status = status;
    await prospect.save();

    return Response.json({
      success: true,
      prospect
    });

  } catch (error) {
    console.error('Update prospect error:', error);
    return Response.json(
      { success: false, error: 'Failed to update prospect' },
      { status: 500 }
    );
  }
}
