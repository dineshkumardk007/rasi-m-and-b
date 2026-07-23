import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
from reportlab.lib.units import inch

pdf_filename = "Rasi_Mom_and_Baby_Website_Component_Guide.pdf"
doc = SimpleDocTemplate(
    pdf_filename,
    pagesize=letter,
    rightMargin=36,
    leftMargin=36,
    topMargin=36,
    bottomMargin=36
)

styles = getSampleStyleSheet()

# Custom Neo-Brutalist / Modern PDF styles
title_style = ParagraphStyle(
    'DocTitle',
    parent=styles['Heading1'],
    fontName='Helvetica-Bold',
    fontSize=22,
    leading=26,
    textColor=colors.HexColor('#2B2140'),
    spaceAfter=6
)

subtitle_style = ParagraphStyle(
    'DocSubTitle',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=11,
    leading=14,
    textColor=colors.HexColor('#6B617D'),
    spaceAfter=15
)

h2_style = ParagraphStyle(
    'SectionHeader',
    parent=styles['Heading2'],
    fontName='Helvetica-Bold',
    fontSize=14,
    leading=18,
    textColor=colors.HexColor('#2B2140'),
    spaceBefore=14,
    spaceAfter=6
)

body_style = ParagraphStyle(
    'BodyTextCustom',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=9.5,
    leading=13,
    textColor=colors.HexColor('#2B2140')
)

table_header_style = ParagraphStyle(
    'TableHeader',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=9,
    leading=12,
    textColor=colors.HexColor('#FFFFFF')
)

table_cell_bold = ParagraphStyle(
    'TableCellBold',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=9,
    leading=12,
    textColor=colors.HexColor('#2B2140')
)

table_cell_code = ParagraphStyle(
    'TableCellCode',
    parent=styles['Normal'],
    fontName='Courier-Bold',
    fontSize=8.5,
    leading=11,
    textColor=colors.HexColor('#EC5D8A')
)

table_cell_text = ParagraphStyle(
    'TableCellText',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=8.5,
    leading=11.5,
    textColor=colors.HexColor('#2B2140')
)

story = []

# Header Banner Title
story.append(Paragraph("<b>Rasi Mom & Baby</b> — Website Component & Visual Editing Guide", title_style))
story.append(Paragraph("Quick reference guide for website section names, doodle wallpaper layer, file paths, fonts, and color palette tokens to easily request edits.", subtitle_style))
story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#2B2140'), spaceAfter=12))

# Section 1: Typography & Fonts
story.append(Paragraph("1. Typography & Font System", h2_style))

font_data = [
    [Paragraph("Font Family Name", table_header_style), Paragraph("Role & Usage Area", table_header_style), Paragraph("Code Variable & CSS Token", table_header_style)],
    [Paragraph("<b>Baloo 2</b>", table_cell_bold), Paragraph("All headlines, section titles, price tags, category tiles & UI badges (Playful Display Font)", table_cell_text), Paragraph("<code>var(--font-baloo)</code> / <code>font-display</code>", table_cell_code)],
    [Paragraph("<b>Karla</b>", table_cell_bold), Paragraph("Body text, product descriptions, input fields, and subtitle text (Clean Sans-Serif)", table_cell_text), Paragraph("<code>var(--font-karla)</code> / <code>font-body</code>", table_cell_code)],
    [Paragraph("<b>Noto Sans Tamil</b>", table_cell_bold), Paragraph("Tamil script text across Tamil language mode (தமிழ்)", table_cell_text), Paragraph("<code>var(--font-tamil)</code> / <code>font-tamil</code>", table_cell_code)],
]

t_font = Table(font_data, colWidths=[1.4*inch, 3.8*inch, 2.2*inch])
t_font.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2B2140')),
    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('GRID', (0,0), (-1,-1), 0.8, colors.HexColor('#2B2140')),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ('TOPPADDING', (0,0), (-1,-1), 5),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#FFFDF8'), colors.HexColor('#FFF5F8')]),
]))
story.append(t_font)
story.append(Spacer(1, 14))

# Section 2: Color Palette Tokens
story.append(Paragraph("2. Color Palette & Background Wallpaper Tokens", h2_style))

color_data = [
    [Paragraph("Color Token Name", table_header_style), Paragraph("Hex Code / Asset", table_header_style), Paragraph("Visual Swatch / Role", table_header_style), Paragraph("Usage in Storefront", table_header_style)],
    [Paragraph("<b>Ink Black</b>", table_cell_bold), Paragraph("<code>#2B2140</code>", table_cell_code), Paragraph("■ Deep Plum Black", table_cell_bold), Paragraph("All outlines, borders, 3D shadows, doodle object strokes", table_cell_text)],
    [Paragraph("<b>Doodle Wallpaper Tile</b>", table_cell_bold), Paragraph("<code>public/doodle-pattern.svg</code>", table_cell_code), Paragraph("🎨 8-Color Neo SVG", table_cell_bold), Paragraph("Hand-drawn baby items (bottles, balloons, duck, stroller, rattle, hearts) with dark ink borders", table_cell_text)],
    [Paragraph("<b>Background Canvas Base</b>", table_cell_bold), Paragraph("<code>#FFEBF2</code> to <code>#E8F3FF</code>", table_cell_code), Paragraph("🌈 Pastel Mesh Base", table_cell_bold), Paragraph("Fixed background canvas gradient behind doodle layer", table_cell_text)],
    [Paragraph("<b>Ambient Glow Blobs</b>", table_cell_bold), Paragraph("<code>#FFB8CC</code>, <code>#FFD68A</code>, <code>#B2E2FF</code>", table_cell_code), Paragraph("✨ Pastel Glow Blobs", table_cell_bold), Paragraph("Soft blurred ambient color spots behind floating doodles (Pink, Yellow, Sky Blue, Lavender)", table_cell_text)],
    [Paragraph("<b>Brand Pink</b>", table_cell_bold), Paragraph("<code>#EC5D8A</code>", table_cell_code), Paragraph("■ Brand Pink", table_cell_bold), Paragraph("Primary Action buttons, brand title accents", table_cell_text)],
    [Paragraph("<b>Ribbon Yellow</b>", table_cell_bold), Paragraph("<code>#FFE1A8</code>", table_cell_code), Paragraph("■ Soft Yellow", table_cell_bold), Paragraph("Top announcement bar text, trust panel background", table_cell_text)],
    [Paragraph("<b>Feeding Yellow</b>", table_cell_bold), Paragraph("<code>#FFE1A8</code> / <code>#F59E0B</code>", table_cell_code), Paragraph("■ Yellow / Amber", table_cell_bold), Paragraph("Feeding & Nursing category tiles & badges", table_cell_text)],
    [Paragraph("<b>Bath Sky Blue</b>", table_cell_bold), Paragraph("<code>#C7E9FF</code> / <code>#3B9EDB</code>", table_cell_code), Paragraph("■ Sky Blue", table_cell_bold), Paragraph("Baby Bath & Skincare category tiles", table_cell_text)],
    [Paragraph("<b>Toys Pink</b>", table_cell_bold), Paragraph("<code>#FFCBD9</code> / <code>#EC5D8A</code>", table_cell_code), Paragraph("■ Pastel Pink", table_cell_bold), Paragraph("Toys & Learning category tiles", table_cell_text)],
    [Paragraph("<b>Clothing Green</b>", table_cell_bold), Paragraph("<code>#D6E8B0</code> / <code>#7CB342</code>", table_cell_code), Paragraph("■ Pistachio Lime", table_cell_bold), Paragraph("Baby Clothes category tiles & bundle save badges", table_cell_text)],
    [Paragraph("<b>Diapering Purple</b>", table_cell_bold), Paragraph("<code>#E4D6FF</code> / <code>#9A6BE0</code>", table_cell_code), Paragraph("■ Lavender Purple", table_cell_bold), Paragraph("Diapering & Wipes category tiles", table_cell_text)],
    [Paragraph("<b>Gear Mint Teal</b>", table_cell_bold), Paragraph("<code>#B9EBDD</code> / <code>#1FB995</code>", table_cell_code), Paragraph("■ Mint Teal", table_cell_bold), Paragraph("Strollers & Gear category tiles", table_cell_text)],
    [Paragraph("<b>Health Coral</b>", table_cell_bold), Paragraph("<code>#FFD6C2</code> / <code>#F26B4A</code>", table_cell_code), Paragraph("■ Peach Coral", table_cell_bold), Paragraph("Health & Safety category tiles", table_cell_text)],
]

t_color = Table(color_data, colWidths=[1.3*inch, 1.8*inch, 1.4*inch, 2.9*inch])
t_color.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2B2140')),
    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('GRID', (0,0), (-1,-1), 0.8, colors.HexColor('#2B2140')),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#FFFFFF'), colors.HexColor('#FFF9EE')]),
]))
story.append(t_color)
story.append(Spacer(1, 14))

# Section 3: Website Parts & Component Names
story.append(Paragraph("3. Website Sections & Component Name Map", h2_style))
story.append(Paragraph("Use these exact Section & Component names when asking for edits or modifications:", body_style))
story.append(Spacer(1, 6))

sections_map = [
    [Paragraph("Part / Section Name", table_header_style), Paragraph("Component Name & File Location", table_header_style), Paragraph("What it Contains & Does", table_header_style)],
    
    [Paragraph("<b>0. Doodle Wallpaper & Canvas</b>", table_cell_bold), 
     Paragraph("<code>DoodleWallpaper</code><br/><code>src/app/layout.tsx</code><br/><code>public/doodle-pattern.svg</code>", table_cell_code), 
     Paragraph("Fixed background canvas layer featuring 8-color hand-drawn baby doodles (bottles, balloons, duck, stroller, rattle, hearts, stars), dark #2B2140 neo outlines, soft ambient pastel color glows, and multi-tone gradient base canvas", table_cell_text)],
    
    [Paragraph("<b>1. Announcement Ticker</b>", table_cell_bold), 
     Paragraph("<code>Ribbon</code><br/><code>src/components/storefront/Ribbon.tsx</code>", table_cell_code), 
     Paragraph("Sticky top bar with scrolling offer ticker ('Free Delivery above ₹499 in Thoothukudi')", table_cell_text)],
    
    [Paragraph("<b>2. Header & Nav Bar</b>", table_cell_bold), 
     Paragraph("<code>Header</code><br/><code>src/components/storefront/Storefront.tsx</code>", table_cell_code), 
     Paragraph("Logo, Language Pill (EN/TA), Sign-in Menu, Floating Cart Counter Button", table_cell_text)],
    
    [Paragraph("<b>3. Hero Section</b>", table_cell_bold), 
     Paragraph("<code>Hero</code><br/><code>src/components/storefront/sections.tsx</code>", table_cell_code), 
     Paragraph("Top banner with Google 4.9★ rating badge, Store Headline, 3D offset CTA buttons ('Start Shopping', 'See Bundles'), Trust Badges & Flagship Store Image Card", table_cell_text)],
    
    [Paragraph("<b>4. Fresh Picks Marquee</b>", table_cell_bold), 
     Paragraph("<code>Marquee</code><br/><code>src/components/storefront/sections.tsx</code>", table_cell_code), 
     Paragraph("Auto-scrolling horizontal product slider showcasing trending baby items with price tags", table_cell_text)],
    
    [Paragraph("<b>5. Category Grid</b>", table_cell_bold), 
     Paragraph("<code>CategoryGrid</code><br/><code>src/components/storefront/sections.tsx</code>", table_cell_code), 
     Paragraph("8 pastel emoji category tiles (Feeding, Bath, Toys, Clothing, Diapering, Gear, Health, Mom)", table_cell_text)],
    
    [Paragraph("<b>6. Buy Again Section</b>", table_cell_bold), 
     Paragraph("<code>BuyAgain</code><br/><code>src/components/storefront/sections.tsx</code>", table_cell_code), 
     Paragraph("Repeat purchase recommendation carousel for logged-in customers", table_cell_text)],
    
    [Paragraph("<b>7. Curated Bundles</b>", table_cell_bold), 
     Paragraph("<code>BundlesSection</code><br/><code>src/components/storefront/sections.tsx</code>", table_cell_code), 
     Paragraph("Grid of combo gift sets (Newborn Starter Kit, Bath Time Gift Set) with savings badges", table_cell_text)],
    
    [Paragraph("<b>8. Shop & Age Filters</b>", table_cell_bold), 
     Paragraph("<code>ShopGrid</code><br/><code>src/components/storefront/sections.tsx</code>", table_cell_code), 
     Paragraph("Milestone Age Filter Pills (0-3M, 3-6M, 1-3Y), Search Input Bar, Product Card Grid, Stock Alerts", table_cell_text)],
    
    [Paragraph("<b>9. Store Trust Panel</b>", table_cell_bold), 
     Paragraph("<code>Trust</code><br/><code>src/components/storefront/sections.tsx</code>", table_cell_code), 
     Paragraph("Thoothukudi local store info, staff names (Karthiga, Lakshmi), opening hours, Google review card", table_cell_text)],
    
    [Paragraph("<b>10. Footer Section</b>", table_cell_bold), 
     Paragraph("<code>Footer</code><br/><code>src/components/storefront/Storefront.tsx</code>", table_cell_code), 
     Paragraph("Bottom brand bar with store address, copyright, and legal page links (Privacy, Terms, Shipping)", table_cell_text)],
    
    [Paragraph("<b>11. Cart Drawer</b>", table_cell_bold), 
     Paragraph("<code>CartDrawer</code><br/><code>src/components/storefront/modals.tsx</code>", table_cell_code), 
     Paragraph("Slide-over cart modal with item quantity controls, free delivery progress bar, gift notes & checkout button", table_cell_text)],
    
    [Paragraph("<b>12. Product Quick View</b>", table_cell_bold), 
     Paragraph("<code>ProductModal</code><br/><code>src/components/storefront/modals.tsx</code>", table_cell_code), 
     Paragraph("Popup product detail modal with full image gallery, reviews, age badge & Add to Cart button", table_cell_text)],
    
    [Paragraph("<b>13. Checkout Modal</b>", table_cell_bold), 
     Paragraph("<code>CheckoutModal</code><br/><code>src/components/storefront/modals.tsx</code>", table_cell_code), 
     Paragraph("Customer checkout popup with name, mobile, address, delivery slot selection & UPI/COD options", table_cell_text)],
]

t_map = Table(sections_map, colWidths=[1.5*inch, 2.4*inch, 3.5*inch])
t_map.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2B2140')),
    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('GRID', (0,0), (-1,-1), 0.8, colors.HexColor('#2B2140')),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ('TOPPADDING', (0,0), (-1,-1), 5),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#FFFFFF'), colors.HexColor('#FFF8F0')]),
]))

story.append(t_map)

# Build document
doc.build(story)
print("PDF created successfully:", pdf_filename)
