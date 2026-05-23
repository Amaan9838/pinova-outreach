import dbConnect from '../../../../../lib/mongodb.js';
import GtdItem from '../../../../../models/GtdItem.js';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/flow/items/:id
 * Update fields on a GTD item.
 */
export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const patch = await request.json();

    const item = await GtdItem.findByIdAndUpdate(id, patch, { new: true, runValidators: true }).lean();
    if (!item) {
      return Response.json({ success: false, error: 'Item not found' }, { status: 404 });
    }

    return Response.json({ success: true, item });
  } catch (error) {
    console.error('PATCH /api/flow/items/:id error:', error);
    return Response.json({ success: false, error: 'Failed to update item' }, { status: 500 });
  }
}

/**
 * DELETE /api/flow/items/:id
 * Permanently delete a GTD item.
 */
export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const item = await GtdItem.findByIdAndDelete(id);
    if (!item) {
      return Response.json({ success: false, error: 'Item not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/flow/items/:id error:', error);
    return Response.json({ success: false, error: 'Failed to delete item' }, { status: 500 });
  }
}
