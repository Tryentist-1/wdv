# Tailwind CSS Setup - Quick Start

## ✅ Tailwind Installed!

**Version:** 4.1.17 (latest)

---

## 🚀 Quick Start - Use CDN (Easiest)

For rapid development, use the Tailwind CDN:

```html
<!-- Add to <head> of HTML files -->
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          'score-gold': '#FFD700',
          'score-red': '#DC143C',
          'score-blue': '#4169E1',
          'score-black': '#000000',
          'score-white': '#FFFFFF',
          'score-miss': '#FF0000',
          'primary': '#2d7dd9',
          'secondary': '#6c757d',
          'success': '#28a745',
          'danger': '#d92d20',
          'warning': '#ffc107',
          'info': '#0dcaf0',
          'purple': '#6f42c1',
          'orange': '#f28c18',
        }
      }
    }
  }
</script>
```

**Pros:**
- ✅ Works immediately
- ✅ No build step
- ✅ Perfect for prototyping
- ✅ Hot reload in browser

**Cons:**
- ❌ Larger file size (~300KB)
- ❌ Not optimized for production

---

## 🏗️ Production Build (Later)

When ready for production, we'll set up the build process:

```bash
npm run build:css:prod
```

This will:
- Purge unused CSS
- Minify output
- Result in ~10-20KB file

---

## 📝 Usage Examples

### Buttons
```html
<!-- Primary Button -->
<button class="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 min-w-[44px] min-h-[44px]">
  Click Me
</button>

<!-- Success Button -->
<button class="bg-success text-white px-4 py-2 rounded hover:bg-success/90">
  Save
</button>

<!-- Danger Button -->
<button class="bg-danger text-white px-4 py-2 rounded hover:bg-danger/90">
  Delete
</button>
```

### Tables
```html
<table class="w-full border-collapse text-sm">
  <thead class="bg-primary text-white sticky top-0">
    <tr>
      <th class="px-2 py-3 text-center font-bold">Archer</th>
      <th class="px-2 py-3 text-center font-bold">Score</th>
    </tr>
  </thead>
  <tbody>
    <tr class="border-b hover:bg-blue-50 even:bg-gray-50">
      <td class="px-2 py-1 text-center">Name</td>
      <td class="px-2 py-1 text-center">30</td>
    </tr>
  </tbody>
</table>
```

### Score Inputs
```html
<!-- Gold Score -->
<input type="text" 
       class="w-full h-full min-h-[44px] text-center font-bold bg-score-gold text-black border-none focus:outline-2 focus:outline-primary" 
       value="10" 
       readonly>

<!-- Red Score -->
<input type="text" 
       class="w-full h-full min-h-[44px] text-center font-bold bg-score-red text-white border-none" 
       value="8" 
       readonly>
```

### Modals
```html
<div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
  <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
    <h2 class="text-xl font-bold mb-4">Modal Title</h2>
    <p class="text-gray-600 mb-4">Modal content goes here</p>
    <div class="flex justify-end gap-2">
      <button class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
      <button class="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90">Confirm</button>
    </div>
  </div>
</div>
```

### Responsive Design
```html
<!-- Hide on mobile, show on desktop -->
<div class="hidden md:block">Desktop only</div>

<!-- Full width on mobile, auto on desktop -->
<button class="w-full md:w-auto">Responsive Button</button>

<!-- Different text sizes -->
<h1 class="text-xl md:text-2xl lg:text-3xl">Responsive Heading</h1>
```

---

## 🎨 Your Custom Colors

All your score and brand colors are available:

- `bg-score-gold` / `text-score-gold`
- `bg-score-red` / `text-score-red`
- `bg-score-blue` / `text-score-blue`
- `bg-score-black` / `text-score-black`
- `bg-score-white` / `text-score-white`
- `bg-score-miss` / `text-score-miss`
- `bg-primary` / `text-primary`
- `bg-secondary` / `text-secondary`
- `bg-success` / `text-success`
- `bg-danger` / `text-danger`
- `bg-warning` / `text-warning`
- `bg-info` / `text-info`
- `bg-purple` / `text-purple`
- `bg-orange` / `text-orange`

---

## 📱 Mobile-First Classes

### Touch Targets
```html
<!-- Minimum 44px touch target -->
<button class="min-w-[44px] min-h-[44px]">👆</button>
```

### Safe Area Insets
```html
<!-- iOS notch/home bar support -->
<div class="pt-[env(safe-area-inset-top)]">
<div class="pb-[env(safe-area-inset-bottom)]">
```

### Responsive Breakpoints
- `sm:` - 640px and up
- `md:` - 768px and up
- `lg:` - 1024px and up
- `xl:` - 1280px and up

---

## 🚀 Next Steps

1. **Add CDN to ranking_round_300.html**
2. **Start converting one table**
3. **Test on mobile**
4. **Iterate and refine**
5. **When happy, set up production build**

---

## 📚 Resources

- [Tailwind Docs](https://tailwindcss.com/docs)
- [Tailwind Cheat Sheet](https://nerdcave.com/tailwind-cheat-sheet)
- [Tailwind Play](https://play.tailwindcss.com/) - Online playground

---

**Ready to start!** 🎯

