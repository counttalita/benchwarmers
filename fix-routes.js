const fs = require('fs');
const path = require('path');

const routeFiles = [
  'src/app/api/engagements/[id]/complete/route.ts',
  'src/app/api/engagements/[id]/status/route.ts', 
  'src/app/api/engagements/[id]/interview/route.ts',
  'src/app/api/engagements/[id]/route.ts',
  'src/app/api/offers/[id]/route.ts',
  'src/app/api/offers/[id]/respond/route.ts'
];

routeFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add resolvedParams declaration after function signature
    if (content.includes('{ params }: { params: Promise<{ id: string }> }') && 
        !content.includes('const resolvedParams = await params')) {
      content = content.replace(
        /(\) \{[\s\n]*)/,
        ') {\n  const resolvedParams = await params\n'
      );
    }
    
    // Replace params.id with resolvedParams.id
    content = content.replace(/params\.id/g, 'resolvedParams.id');
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${filePath}`);
  }
});
