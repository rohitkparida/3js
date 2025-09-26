# 🎨 Export to Spline 3D

This guide explains how to export Three.js scenes from this project to Spline 3D.

## 🚀 Quick Export

1. **Full Scene Export**
   - Click "🎨 Export to Spline" button in the UI
   - Downloads a `.glb` file of the entire scene
   - Use this file to import directly into Spline 3D

2. **Layer-based Export**
   - 🏢 **Export Buildings**: Roads, Structures, Archway
   - 🚗 **Export Vehicles**: Cars and vehicles only
   - 🌳 **Export Nature**: Trees and vegetation

## 📦 Import in Spline

### Step 1: Download File
After clicking export, the browser automatically downloads:
- `3D_Scene_YYYY-MM-DD.glb`
- Contains complete scene as optimized for Spline

### Step 2: Import into Spline
1. Open [Spline 3D](https://spline.design)
2. Create new project or open existing
3. Go to "Import GLTF"
4. Upload your exported `.glb` file
5. Click "Import"

### Step 3: Optimize in Spline
- **Reposition**: Move/scale imported objects as needed
- **Apply Materials**: Spline may need material updates
- **Set Lighting**: Add Spline lighting sources
- **Add Interactions**: Set up animations/camera controls

## 🔧 Technical Details

### What Gets Exported
- ✅ **Geometry**: All mesh objects (buildings, trees, vehicles)
- ✅ **Transforms**: Position, rotation, scale
- ✅ **Materials**: Base colors and textures  
- ✅ **Animations**: Fountain animations (from GLB models)
- ⚠️ **Physics**: Excluded (Spline handles separately)
- ⚠️ **Dynamic Behaviors**: Interactivity needs recreation

### What to Expect
- **Models**: Preserved from original GLB/GLTF files
- **Geometry**: Buildings/roads created procedurally  
- **Materials**: Basic materials converted for compatibility
- **Animations**: Foundation data; may need refinement in Spline

## 📝 Current Scene Content

This map contains:
```
🏗️ Buildings & Infrastructure
├── Commercial district (shops, offices)
├── Residential buildings (houses, apartments)  
├── Industrial structures (warehouses, plants)
├── Public buildings (government, hospitals)
├── Roads & highways with lane markings
└── Archway entrance monument

🚗 Vehicles
├── Cars on primary road
├── Cars on residential lanes  
├── Traffic facing appropriate directions
└── GLB models with proper scaling

🌳 Environment  
├── Trees (procedural variation)
├── Terrain with height displacement
├── Animated fountain
├── Tripod camera (filming reporter)
└── Ground surfaces

🎬 Assets
├── Fountain.glb (animated)
├── Camera.glb
├── Reporter.gltf
├── Cars (car1.glb, car2.glb)
└── Archway.glb
```

## 🔍 Troubleshooting

### Export Issues
- Ensure "Export to Spline" button works
- Check browser console for errors
- File downloads to Downloads folder by default
- Large scenes may take time to export

### Spline Import Issues
- Try importing objects separately (use layer buttons)
- Spline may prompt for format conversion
- Complex materials may need recreation
- Large scenes: Break into smaller components

### Missing Elements
Common missing items in Spline:
- Physics boundaries (must recreate externally)
- Lighting preset (use Spline lighting)
- Transparent surfaces (check material settings)
- Dynamic behaviors (drag to "empty" and re-link)

## 🎯 Next Steps

### Recommended Workflow
1. Export full scene for base reference
2. Export specific layers (buildings/roads)
3. Import base scene
4. Add/replace layer imports as required
5. Recreate lighting
6. Set up cameras  
7. Add Spline interactions
8. Export/interact as intended

### Enhancing for Spline
- Enable raycasting for ground interaction  
- Replace car animation with Spline animators
- Set global fog parameters
- Imagine as planning tool: add human avatars
- Update functions architecture

---

✨ **Ready to Export?** 
Click the "Export to Spline" button in your scene UI!
