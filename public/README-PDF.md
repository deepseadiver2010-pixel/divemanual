# Navy Diving Manual PDF Setup

## Current File

The optimized U.S. Navy Diving Manual (Revision 7) is located in this directory:
- **Filename**: `navy-diving-manual.pdf`
- **Location**: `/public/navy-diving-manual.pdf`
- **Version**: Revision 7 (991 pages)
- **Format**: Linearized/optimized for web delivery (progressive rendering)

## Alternative: Use Supabase Storage

For production, you should upload the PDF to Supabase Storage:

1. Go to your Lovable Cloud backend
2. Navigate to Storage
3. Create a bucket called `manuals`
4. Upload the Navy Diving Manual PDF
5. Update the `pdfUrl` in `src/pages/DocumentViewer.tsx` to point to the Supabase Storage URL:

```typescript
const pdfUrl = `${supabaseUrl}/storage/v1/object/public/manuals/navy-diving-manual.pdf`;
```

## PDF Requirements

- The PDF should be the complete, official U.S. Navy Diving Manual
- Ensure all volumes are included
- File size should be optimized for web delivery (typically under 50MB)
- PDF should have text layer enabled for search functionality
- **Recommended**: Use linearized PDFs for faster initial page rendering (pages load progressively as download continues)
