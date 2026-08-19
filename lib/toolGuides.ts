export type ToolGuideKey = keyof typeof toolGuides;

type ToolGuide = {
  summary: string[];
  facts: Array<{ label: string; value: string }>;
  steps: string[];
  bestFor: string[];
  watchFor: string[];
  privacy: string;
  faq: Array<{ question: string; answer: string }>;
  related: Array<{ href: string; label: string }>;
};

export const toolGuides = {
  "jpg-to-png": {
    summary: [
      "JPG is efficient for photographs but does not provide a general transparency channel. PNG stores decoded pixels losslessly and is a better working format for sharp graphics, screenshots, and assets that will be edited again.",
      "Converting a JPG to PNG does not recover detail already removed by JPEG compression. Use this conversion when a PNG workflow or software requirement calls for it, not as an automatic image enhancer.",
    ],
    facts: [
      { label: "Input", value: "JPG or JPEG" },
      { label: "Output", value: "PNG" },
      { label: "Orientation", value: "Camera orientation is normalized" },
      { label: "Transparency", value: "The existing image stays opaque" },
    ],
    steps: [
      "Select the original JPG rather than a screenshot or messaging-app copy.",
      "Review the preview and confirm that the photo is oriented correctly.",
      "Choose Convert to PNG and wait for the download to finish.",
      "Open the downloaded PNG and check its dimensions and visible quality.",
      "Keep the JPG master if its smaller file size is still useful for delivery.",
    ],
    bestFor: ["Preparing a photo for a PNG-only workflow", "Adding transparency in a later editing step", "Avoiding another lossy JPEG save", "Compatibility with software that requests PNG"],
    watchFor: ["The PNG may be much larger than the source JPG.", "Existing JPEG blocks or halos remain in the result.", "Conversion alone does not create a transparent background."],
    privacy: "The file is sent to the Pixores conversion endpoint only to create the requested PNG. Do not upload confidential images unless server processing is appropriate for your use case.",
    faq: [
      { question: "Will JPG to PNG improve image quality?", answer: "No lost detail is restored. The PNG prevents additional JPEG loss in that new copy, but it preserves the quality and artifacts already present in the source." },
      { question: "Will the PNG have a transparent background?", answer: "No. An ordinary JPG has no alpha channel, so its visible background remains opaque after conversion." },
      { question: "Why is the PNG larger?", answer: "PNG must preserve complex pixel variation losslessly, while JPEG is designed to discard some photographic detail for a smaller file." },
    ],
    related: [{ href: "/blog/jpg-vs-png", label: "JPG vs PNG decision guide" }, { href: "/remove-background", label: "Create a transparent cutout" }],
  },
  "png-to-jpg": {
    summary: [
      "JPG is a practical delivery format for photographs when transparency is not required. Converting a large photographic PNG can reduce file size substantially, but the result becomes lossy and cannot preserve transparent pixels.",
      "Review transparent or partially transparent areas before converting. They must be flattened onto a solid background, and the chosen background should match the final design.",
    ],
    facts: [
      { label: "Input", value: "PNG" },
      { label: "Output", value: "JPG" },
      { label: "Best match", value: "Photographic images" },
      { label: "Transparency", value: "Not retained by JPG" },
    ],
    steps: ["Open the PNG on a light and dark background to identify transparent edges.", "Choose the intended solid background before conversion when transparency exists.", "Select the PNG and run the conversion.", "Inspect text, logos, and high-contrast edges for JPEG artifacts.", "Compare file size and visual quality at the final display dimensions."],
    bestFor: ["Photographs saved unnecessarily as PNG", "Smaller email or web delivery files", "Services that accept JPG but not PNG", "Final copies that no longer need transparency"],
    watchFor: ["Transparent pixels must be flattened.", "Small text and line art may look softer.", "Repeated JPG saves can add visible artifacts."],
    privacy: "Pixores processes the selected file on its conversion endpoint and returns a JPG download. Retain the original PNG as the editable master.",
    faq: [
      { question: "Does JPG support transparency?", answer: "No. Transparent areas must be replaced by a solid color before or during conversion." },
      { question: "Should logos be converted to JPG?", answer: "Usually not when transparency or exact sharp edges matter. PNG or a suitable vector format is normally a better working asset." },
      { question: "When will the file become smaller?", answer: "The biggest reduction usually occurs with complex photographs. Flat graphics may not benefit enough to justify the quality loss." },
    ],
    related: [{ href: "/blog/jpg-vs-png", label: "Compare JPG and PNG" }, { href: "/compress-image", label: "Compress a delivery image" }],
  },
  "jpg-to-webp": {
    summary: [
      "WebP is a modern web delivery format that can encode photographs efficiently. Converting a JPG to WebP is most useful when a website or publishing system accepts WebP and you verify the result in the browsers and tools used by your audience.",
      "Because the JPG source has already been compressed, conversion cannot restore discarded detail. The goal is a suitable delivery copy, not a higher-fidelity master.",
    ],
    facts: [{ label: "Input", value: "JPG or JPEG" }, { label: "Output", value: "WebP" }, { label: "Primary use", value: "Web delivery" }, { label: "Source quality", value: "Existing JPEG artifacts remain" }],
    steps: ["Use the least-compressed JPG source available.", "Convert it to WebP and open the result locally.", "Compare both files at the same displayed size.", "Inspect faces, gradients, text, and high-contrast edges.", "Publish WebP only after confirming platform and fallback requirements."],
    bestFor: ["Website photographs", "Blog and landing-page images", "Modern content management systems", "Reducing transfer size after visual review"],
    watchFor: ["Do not delete the original JPG master.", "Some older editing tools may not import WebP.", "A smaller file is not useful if visible artifacts harm the image."],
    privacy: "The selected JPG is uploaded to the Pixores conversion endpoint for processing and returned as a WebP file.",
    faq: [{ question: "Is WebP always smaller than JPG?", answer: "Not for every image or encoder setting. Compare the actual files and visible result instead of assuming the extension guarantees a reduction." }, { question: "Can WebP be used outside browsers?", answer: "Many current applications support it, but compatibility still varies in older software and publishing workflows." }, { question: "Does conversion improve the JPG?", answer: "No. It creates another encoded delivery copy from the existing pixels." }],
    related: [{ href: "/blog/webp-vs-avif-vs-jpeg", label: "WebP, AVIF, and JPEG compared" }, { href: "/compress-image", label: "Image compression guide and tool" }],
  },
  "png-to-webp": {
    summary: [
      "WebP can preserve transparency while producing a smaller web asset than many PNG files. It is often useful for cutouts, interface graphics, and mixed photographic designs, provided the destination accepts WebP.",
      "The current Pixores conversion uses a high-quality WebP output. Always inspect transparent edges and small text because delivery requirements differ between logos, screenshots, and photographs.",
    ],
    facts: [{ label: "Input", value: "PNG" }, { label: "Output", value: "WebP" }, { label: "Encoder quality", value: "90" }, { label: "Transparency", value: "Supported by WebP" }],
    steps: ["Confirm whether the PNG contains transparency.", "Convert the original-resolution PNG.", "Place the WebP over light and dark backgrounds.", "Compare text, edges, gradients, and file size.", "Keep the PNG as a master or fallback when compatibility matters."],
    bestFor: ["Transparent web graphics", "Product cutouts", "Mixed photo-and-text assets", "Reducing oversized PNG delivery files"],
    watchFor: ["Do not use file size as the only quality test.", "Older tools may still require PNG.", "Very simple PNG graphics can already be efficient."],
    privacy: "Pixores sends the PNG to its conversion endpoint and returns the encoded WebP. The guide recommends retaining the original PNG separately.",
    faq: [{ question: "Will transparency be preserved?", answer: "WebP supports alpha transparency, so a valid transparent PNG can retain transparent areas in the converted output." }, { question: "Should I replace every PNG with WebP?", answer: "No. Keep PNG where exact lossless pixels, editing compatibility, or a required fallback matters." }, { question: "Why test on two backgrounds?", answer: "Light and dark backgrounds reveal edge contamination, halos, and partially transparent pixels that may be invisible on one color." }],
    related: [{ href: "/blog/make-transparent-background-png", label: "Transparent background workflow" }, { href: "/webp-to-png", label: "Convert WebP back to PNG" }],
  },
  "webp-to-jpg": {
    summary: [
      "Convert WebP to JPG when a destination does not accept WebP and the image does not need transparency. JPG is widely compatible for photographs, but transparent pixels must be flattened and another lossy encoding step is introduced.",
      "Keep the WebP source until the JPG has been reviewed. Conversion is a compatibility step, not a way to recover an earlier original.",
    ],
    facts: [{ label: "Input", value: "WebP" }, { label: "Output", value: "JPG" }, { label: "Best match", value: "Opaque photographs" }, { label: "Transparency", value: "Must be flattened" }],
    steps: ["Check whether the WebP contains transparent pixels.", "Choose a suitable background if transparency is present.", "Run the conversion and open the JPG.", "Inspect gradients and hard edges for new artifacts.", "Use the JPG only for the destination that requires it."],
    bestFor: ["Legacy upload forms", "Photo software without WebP import", "Email and document workflows", "Opaque photographic delivery"],
    watchFor: ["JPG cannot retain transparency.", "Animated WebP is not represented as an animated JPG.", "Another lossy save can reduce quality."],
    privacy: "The WebP is processed on the Pixores conversion endpoint to produce the requested JPG download.",
    faq: [{ question: "What happens to an animated WebP?", answer: "A JPG cannot animate. Use a workflow designed for animation rather than expecting frame preservation in a still-image conversion." }, { question: "Why can the JPG look different?", answer: "Transparency flattening and JPEG compression can change edges, fine texture, and gradients." }, { question: "Is JPG more compatible?", answer: "It is broadly supported, especially by older tools, but confirm the actual destination requirements." }],
    related: [{ href: "/blog/webp-vs-avif-vs-jpeg", label: "Understand web image formats" }, { href: "/webp-to-png", label: "Preserve transparency with PNG" }],
  },
  "webp-to-png": {
    summary: [
      "PNG is a useful compatibility and editing format for a still WebP, especially when transparency must be preserved. The conversion decodes the current WebP pixels into a lossless PNG; it does not recreate an original file that existed before the WebP.",
      "Expect a larger result for photographs. Choose PNG because the next workflow needs lossless pixels or alpha transparency, not because a larger number of bytes implies better source detail.",
    ],
    facts: [{ label: "Input", value: "WebP" }, { label: "Output", value: "PNG" }, { label: "Transparency", value: "Preserved for still images" }, { label: "Likely size", value: "Often larger for photos" }],
    steps: ["Select the original WebP file.", "Convert and download the PNG.", "Inspect the output on contrasting backgrounds.", "Confirm dimensions and transparency in the target editor.", "Retain the WebP for efficient web delivery if it remains useful."],
    bestFor: ["Editors that do not import WebP", "Transparent still images", "Lossless intermediate editing", "PNG-only publishing requirements"],
    watchFor: ["Animation cannot be represented by one ordinary PNG.", "The file can become substantially larger.", "Prior WebP loss remains decoded into the PNG."],
    privacy: "The WebP is uploaded for the requested conversion and returned as a PNG download.",
    faq: [{ question: "Does PNG restore lost WebP detail?", answer: "No. It preserves the decoded result without adding another lossy encoding step, but cannot reconstruct earlier pixels." }, { question: "Will alpha transparency remain?", answer: "For a still WebP with transparency, PNG supports retaining that alpha information." }, { question: "Why use PNG instead of JPG?", answer: "Choose PNG when transparency, sharp graphics, or a lossless intermediate file matters." }],
    related: [{ href: "/png-to-webp", label: "Create a WebP delivery copy" }, { href: "/blog/jpg-vs-png", label: "JPG and PNG explained" }],
  },
  "heic-to-jpg": {
    summary: [
      "HEIC is common on Apple devices and can store high-quality photos efficiently, but some forms, editors, and document systems still expect JPG. This tool decodes a HEIC image, respects its orientation, and creates a high-quality JPG for broader compatibility.",
      "HEIC containers may include multiple images, depth information, or other metadata that a single JPG cannot represent. Keep the original HEIC as the camera master.",
    ],
    facts: [{ label: "Input", value: "HEIC or HEIF image" }, { label: "Output", value: "JPG" }, { label: "JPEG quality", value: "95 with 4:4:4 chroma" }, { label: "Orientation", value: "Normalized before export" }],
    steps: ["Copy the original HEIC from the device without messaging-app recompression.", "Select it in Pixores and start conversion.", "Open the JPG and compare orientation, color, and crop.", "Check faces, skies, and gradients for visible changes.", "Store the HEIC master and use the JPG as the compatibility copy."],
    bestFor: ["Upload forms that reject HEIC", "Windows or legacy editor compatibility", "Adding a phone photo to a document", "Creating a widely supported delivery copy"],
    watchFor: ["A JPG does not preserve every HEIC container feature.", "Metadata retention should not be assumed.", "Color can vary between color-managed and unmanaged applications."],
    privacy: "The HEIC file is sent to the Pixores conversion endpoint to decode and create the JPG. Avoid sensitive uploads when server conversion is not appropriate.",
    faq: [{ question: "Will Live Photo motion be included?", answer: "No. A JPG is a still image and cannot represent the associated motion component." }, { question: "Should I delete the HEIC after conversion?", answer: "No. Keep the original because it may contain more source information and avoids another generation of compression." }, { question: "Why can colors look different?", answer: "Color profiles, HDR information, and application color management can affect how HEIC and JPG are displayed." }],
    related: [{ href: "/jpg-to-png", label: "Prepare the JPG for a PNG workflow" }, { href: "/resize-image", label: "Resize the compatible copy" }],
  },
  "jpg-to-pdf": {
    summary: [
      "This tool places one oriented JPG onto a PDF page sized to the image. It is useful when a form, archive, or recipient requires a PDF wrapper for a single photograph or scan.",
      "The output is an image-based PDF, not searchable text. Use optical character recognition or a document-specific workflow when you need editable or searchable text.",
    ],
    facts: [{ label: "Input", value: "One JPG image" }, { label: "Output", value: "One-page PDF" }, { label: "Page size", value: "Matches image dimensions" }, { label: "Image encoding", value: "Oriented JPG at quality 95" }],
    steps: ["Choose the clearest original scan or photo.", "Correct crop and rotation before conversion.", "Convert and open the PDF in a separate viewer.", "Confirm page orientation and that no edge was cut off.", "Use a document workflow if multiple pages or searchable text are required."],
    bestFor: ["A form that requires PDF", "A one-page visual handout", "Packaging one scan for sharing", "Preserving image proportions on a PDF page"],
    watchFor: ["The text inside the photo remains pixels.", "This route creates one page from one image.", "Private documents require careful handling and storage."],
    privacy: "The JPG is uploaded to the Pixores conversion endpoint and returned inside a generated PDF. Do not upload identity, medical, legal, or financial documents unless this processing is appropriate for you.",
    faq: [{ question: "Will text become selectable?", answer: "No. The image is embedded on the PDF page; OCR is not performed." }, { question: "Can I combine several JPG files?", answer: "This focused route creates a one-page PDF. Use a multi-page document workflow for several images." }, { question: "Does the page use Letter or A4?", answer: "The generated page follows the oriented image dimensions rather than forcing it into a standard paper size." }],
    related: [{ href: "/document-converter", label: "Document conversion options" }, { href: "/crop-image", label: "Crop the scan before conversion" }],
  },
  "compress-image": {
    summary: [
      "Image compression should be evaluated at the size where people will actually view the image. The Pixores compressor normalizes orientation and creates a JPEG at quality 60, a practical delivery setting for many photographs but not the right output for transparency or every graphic.",
      "Keep the original. Compression is a publishing step, and the smaller file should be reviewed for faces, text, gradients, and high-contrast edges before use.",
    ],
    facts: [{ label: "Accepted upload", value: "JPG, PNG, or WebP" }, { label: "Output", value: "Compressed JPG" }, { label: "JPEG quality", value: "60" }, { label: "Transparency", value: "Not retained in JPG" }],
    steps: ["Resize oversized dimensions before compression when possible.", "Select a representative source and create the compressed copy.", "Compare it with the original at the final display size.", "Inspect text, skin, skies, gradients, and edges at 100 percent.", "Publish only the derivative and retain the original master."],
    bestFor: ["Website photographs", "Blog cover images", "Email-friendly photo copies", "Reducing transfer time for opaque images"],
    watchFor: ["Transparent images are flattened for JPG output.", "Graphics with text may show ringing.", "Repeated compression creates cumulative loss."],
    privacy: "The image is processed by the Pixores compression endpoint. Use local tools for files that should never leave the device.",
    faq: [{ question: "Will the pixel dimensions change?", answer: "The compressor targets encoding size rather than deliberate dimension changes. Use Resize Image when width or height must change." }, { question: "Is quality 60 suitable for every image?", answer: "No single setting is universal. Review the actual result and use a different workflow when fine detail or text does not survive." }, { question: "Why did a transparent image change?", answer: "The current compressed output is JPEG, which cannot preserve an alpha channel." }],
    related: [{ href: "/blog/compress-images-for-website-seo", label: "Complete web compression workflow" }, { href: "/resize-image", label: "Resize before compression" }],
  },
  "resize-image": {
    summary: [
      "Resizing changes pixel dimensions. It is different from compression, which primarily changes how pixel data is encoded. Choose dimensions based on the largest real display slot instead of exporting an unnecessarily large source.",
      "The current Pixores route creates a JPG at the requested width and height. Entering dimensions with a different aspect ratio can stretch the subject, so calculate matching dimensions or crop first.",
    ],
    facts: [{ label: "Accepted upload", value: "Common image formats" }, { label: "Output", value: "JPG" }, { label: "Sizing", value: "Exact requested width and height" }, { label: "Orientation", value: "Camera orientation is normalized" }],
    steps: ["Record the source dimensions and aspect ratio.", "Choose the actual target dimensions required by the destination.", "Keep width and height proportional unless distortion is intentional.", "Resize, download, and inspect edges and small text.", "Compress the final-sized copy only after dimensions are correct."],
    bestFor: ["Preparing website image slots", "Matching social-media dimensions", "Reducing oversized camera images", "Creating consistent gallery dimensions"],
    watchFor: ["Mismatched proportions can stretch the image.", "Enlargement does not recreate true detail.", "The current output is JPG and does not retain transparency."],
    privacy: "The source is uploaded to the Pixores resize endpoint to produce the requested JPG. Preserve the original separately.",
    faq: [{ question: "How do I avoid stretching?", answer: "Keep the original aspect ratio or crop to the target ratio before resizing." }, { question: "Should I resize or compress first?", answer: "Usually resize first, then compress the delivery copy, because unused pixels should not be encoded and transferred." }, { question: "Can resizing sharpen a blurry image?", answer: "Reducing dimensions can make some defects less visible, but ordinary enlargement cannot recover missing focus or detail." }],
    related: [{ href: "/blog/resize-image-without-stretching", label: "Aspect-ratio and resizing guide" }, { href: "/crop-image", label: "Crop to the target ratio first" }],
  },
  "rotate-image": {
    summary: [
      "Photo orientation can come from stored metadata rather than the raw pixel order. Pixores first normalizes the camera orientation, then applies the selected 90-degree rotation and horizontal or vertical mirror operation.",
      "The output keeps PNG, WebP, or JPG based on the source type and uses high-quality encoder settings. Review text and asymmetric objects carefully after mirroring.",
    ],
    facts: [{ label: "Input", value: "JPG, PNG, or WebP" }, { label: "Rotation", value: "90°, 180°, or 270°" }, { label: "Mirroring", value: "Horizontal and vertical" }, { label: "Output", value: "Matches supported source type" }],
    steps: ["Select the image and let the preview load.", "Rotate until the horizon and subject are correct.", "Use flip only when a true mirror image is intended.", "Download and open the result outside the browser.", "Check readable text, logos, and left-right details before publishing."],
    bestFor: ["Phone photos displayed sideways", "Correcting scanned pages", "Mirroring a design element", "Normalizing orientation before another edit"],
    watchFor: ["Mirroring makes text read backward.", "A rotation does not straighten a tilted horizon by arbitrary degrees.", "Keep the untouched camera file as the source master."],
    privacy: "Rotation is performed by the Pixores image endpoint, which receives the file for the requested operation.",
    faq: [{ question: "Why did my photo look correct before upload?", answer: "Some viewers honor orientation metadata while other workflows inspect the underlying pixel order. Normalizing orientation makes the pixels consistent." }, { question: "Does flip mean rotate?", answer: "No. Rotation turns the image; flip creates a mirror across the horizontal or vertical axis." }, { question: "Will the format change?", answer: "Supported JPG, PNG, and WebP sources are returned in the corresponding format with format-specific quality settings." }],
    related: [{ href: "/crop-image", label: "Crop after correcting orientation" }, { href: "/resize-image", label: "Resize the corrected image" }],
  },
  "favicon-generator": {
    summary: [
      "A favicon package needs more than one tiny file because browser tabs, bookmarks, iOS home screens, Android launchers, and manifests use different sizes. Pixores generates a ZIP with common PNG sizes, an ICO-compatible file, and a web manifest.",
      "Start from a simple square mark with generous padding. Fine text and thin detail disappear at 16 by 16 pixels, so review the smallest output rather than judging only the large source.",
    ],
    facts: [{ label: "Input", value: "A square logo or image" }, { label: "Outputs", value: "16, 32, 180, 192, and 512 px" }, { label: "Package", value: "ZIP with icons and manifest" }, { label: "Orientation", value: "Normalized before resizing" }],
    steps: ["Prepare a square source with a transparent or intentional background.", "Remove tiny words and leave breathing room around the mark.", "Generate and download the favicon package.", "Inspect 16 px and 32 px files at actual size.", "Install the declared files and verify their production URLs."],
    bestFor: ["New websites", "Replacing framework placeholder icons", "PWA manifests", "Consistent browser and device branding"],
    watchFor: ["A detailed logo may become unreadable.", "Transparent marks need enough contrast in light and dark browser themes.", "Caching can delay favicon updates after deployment."],
    privacy: "The source logo is uploaded to the Pixores favicon endpoint to create the downloadable package.",
    faq: [{ question: "Why are several sizes necessary?", answer: "Different browser and device contexts request different icon dimensions and file declarations." }, { question: "Why does the old icon still appear?", answer: "Favicons are cached aggressively. Confirm the new URLs first, then test with a fresh profile or after cache invalidation." }, { question: "Should the favicon contain the full brand name?", answer: "Usually not. A simple mark or initial survives tiny rendering more reliably than a wordmark." }],
    related: [{ href: "/blog/favicon-sizes-guide-2026", label: "Favicon files and installation guide" }, { href: "/png-to-webp", label: "Prepare other web assets" }],
  },
  "remove-background": {
    summary: [
      "Background removal predicts which pixels belong to the foreground subject and returns a PNG with transparency. Strong separation, adequate resolution, and visible edges help, while hair, glass, smoke, shadows, and low contrast require closer review.",
      "The current Pixores tool accepts JPG, PNG, and WebP images up to 20 MB. It uses server-side AI, requires sign-in, and charges one credit only for a successful process.",
    ],
    facts: [{ label: "Input", value: "JPG, PNG, or WebP up to 20 MB" }, { label: "Output", value: "Transparent PNG" }, { label: "Processing", value: "Server-side AI" }, { label: "Account", value: "Sign-in and one successful AI credit" }],
    steps: ["Choose a source where the subject is in focus and separated from the background.", "Run removal and download the transparent PNG.", "Place the result over white, black, and a saturated color.", "Inspect hair, gaps, reflections, and product edges at 100 percent.", "Keep the source and use the cutout as a derivative asset."],
    bestFor: ["Thumbnail subjects", "Product cutouts", "Profile graphics", "Compositing a subject into a new design"],
    watchFor: ["Transparent or reflective objects can be misclassified.", "Soft shadows may be removed with the background.", "AI output needs human review before commercial use."],
    privacy: "This AI operation uploads the image for server processing. Do not use it for confidential or sensitive images unless that processing is appropriate and permitted.",
    faq: [{ question: "Why are hair edges imperfect?", answer: "Hair contains fine, partially transparent strands that can resemble background texture. Test on contrasting colors and correct important assets in a layer editor." }, { question: "Why is the download PNG?", answer: "PNG supports the alpha transparency needed to represent removed background pixels." }, { question: "Does the source need a plain background?", answer: "Not always, but clear contrast and an unobstructed subject usually produce a more reviewable result." }],
    related: [{ href: "/blog/make-transparent-background-png", label: "Transparent PNG quality guide" }, { href: "/youtube-thumbnail-maker", label: "Use the cutout in a thumbnail" }],
  },
  "image-upscaler": {
    summary: [
      "AI upscaling enlarges the pixel grid and predicts plausible detail. It can make moderate enlargement cleaner, but generated detail is not recovered evidence and must be reviewed around faces, text, hands, patterns, and product edges.",
      "Pixores provides 2x and 4x options, accepts files up to 20 MB, and caps either output side at 4096 pixels. The server-side AI operation requires sign-in and one credit for a successful result.",
    ],
    facts: [{ label: "Input", value: "JPG, PNG, or WebP up to 20 MB" }, { label: "Scale", value: "2x or 4x" }, { label: "Maximum side", value: "4096 pixels" }, { label: "Processing", value: "Server-side AI with one successful credit" }],
    steps: ["Use the highest-quality original available.", "Start with 2x unless the delivery size requires more.", "Compare original and result at equal displayed dimensions.", "Inspect generated details at 100 percent.", "Resize the approved output to the actual delivery dimensions."],
    bestFor: ["Moderately small web graphics", "Preparing a source for a larger composition", "Reducing visible stair-stepping", "Creating a higher-resolution derivative for review"],
    watchFor: ["Small text can become incorrect symbols.", "Faces and repeated textures may acquire invented detail.", "A larger file does not make the source more truthful."],
    privacy: "The image is uploaded for server-side AI processing. Keep confidential, regulated, or evidentiary imagery out of this workflow unless permitted.",
    faq: [{ question: "Should I choose 2x or 4x?", answer: "Start with the smallest scale that meets the real output dimensions. A restrained scale usually reduces artifacts and file size." }, { question: "Can upscaling fix an out-of-focus photo?", answer: "It may change edge appearance, but it cannot recover focus information that was never captured." }, { question: "Why is the result capped?", answer: "The 4096-pixel side limit keeps processing and output within the current service boundary." }],
    related: [{ href: "/blog/increase-image-resolution-ai", label: "AI upscaling limits and review guide" }, { href: "/resize-image", label: "Resize the approved result" }],
  },
  "crop-image": {
    summary: [
      "Cropping changes composition by selecting a rectangular region; it does not stretch the selected pixels. Pixores processes the crop locally in the browser and lets you drag visually or enter exact width, height, X, and Y values.",
      "Choose a free crop or a common aspect ratio, then export PNG, JPG, or WebP. The crop is drawn from the original-resolution image rather than from the smaller screen preview.",
    ],
    facts: [{ label: "Processing", value: "Local in the browser" }, { label: "Controls", value: "Visual crop plus exact pixel fields" }, { label: "Ratios", value: "Free and common presets" }, { label: "Output", value: "PNG, JPG, or WebP" }],
    steps: ["Select the original-resolution image.", "Choose the destination's aspect ratio before fine positioning.", "Move and resize the crop around the essential subject.", "Check exact pixel values when a platform has fixed requirements.", "Download and confirm the exported dimensions."],
    bestFor: ["Social-media aspect ratios", "Removing distracting edges", "Preparing a thumbnail subject", "Creating exact pixel dimensions without distortion"],
    watchFor: ["Cropping permanently removes pixels from the derivative.", "Important text and faces need safe space from edges.", "A very small crop may not have enough resolution for enlargement."],
    privacy: "The crop is rendered on your device; the selected image is not uploaded to a Pixores server for this operation.",
    faq: [{ question: "Does cropping reduce quality?", answer: "The selected pixels are exported at their source resolution, but a small crop contains fewer total pixels and may be insufficient for a large display." }, { question: "How is cropping different from resizing?", answer: "Cropping removes outer areas; resizing changes the dimensions of the remaining image." }, { question: "Which format should I export?", answer: "Use PNG for transparency or sharp graphics, and JPG or WebP for reviewed photographic delivery copies." }],
    related: [{ href: "/blog/resize-image-without-stretching", label: "Crop and aspect-ratio guide" }, { href: "/resize-image", label: "Resize after cropping" }],
  },
  "watermark-image": {
    summary: [
      "A watermark can identify ownership, communicate a preview status, or connect an image to a brand, but it does not prevent every kind of copying. Pixores adds text or a logo locally in the browser and supports one image or a batch downloaded as a ZIP.",
      "Adjust position, opacity, size, rotation, and optional tiling while checking that the mark remains visible without obscuring the subject or misleading viewers about the image.",
    ],
    facts: [{ label: "Processing", value: "Local in the browser" }, { label: "Watermark", value: "Text or uploaded logo" }, { label: "Batch", value: "Multiple images with ZIP download" }, { label: "Output", value: "Original type, PNG, JPG, or WebP" }],
    steps: ["Add the final-resolution images rather than tiny previews.", "Choose text or a logo that you are permitted to use.", "Set position and opacity while viewing both light and dark areas.", "Use tiling only when stronger preview protection is necessary.", "Export and inspect every batch result before publication."],
    bestFor: ["Photography previews", "Brand identification", "Draft or proof labeling", "Applying one consistent mark to a batch"],
    watchFor: ["Edge watermarks are easier to crop away.", "High opacity can hide important content.", "A watermark does not replace written licensing terms."],
    privacy: "Images and logo assets stay in the browser for this operation; they are not uploaded to a Pixores processing server.",
    faq: [{ question: "Can a watermark guarantee protection?", answer: "No. It can discourage casual reuse and identify a source, but determined editing may still remove it." }, { question: "Where should I place it?", answer: "Use a location that overlaps meaningful visual information without covering the main subject. Tiling offers stronger preview coverage." }, { question: "Why use a transparent logo?", answer: "A transparent PNG or WebP logo blends into the image without an unwanted rectangular background." }],
    related: [{ href: "/blog/how-to-watermark-images", label: "Watermark strategy and limitations" }, { href: "/resize-image", label: "Prepare final dimensions first" }],
  },
  "document-converter": {
    summary: [
      "Pixores converts DOCX to PDF or reconstructs PDF text in an editable DOCX directly in the browser. Files are limited to 25 MB and are not uploaded for this operation.",
      "Document conversion is not a perfect round trip. Complex layouts, uncommon fonts, password protection, scanned pages, forms, and advanced PDF features may require manual correction or specialized software.",
    ],
    facts: [{ label: "Directions", value: "DOCX to PDF or PDF to DOCX" }, { label: "Maximum file", value: "25 MB" }, { label: "Processing", value: "Local in the browser" }, { label: "Account", value: "Not required" }],
    steps: ["Keep an untouched copy of the source document.", "Choose the correct conversion direction and select the file.", "Start conversion and wait for the download to begin.", "Open the result in a separate PDF or Word-compatible application.", "Review page breaks, tables, images, fonts, lists, and hyperlinks before sharing."],
    bestFor: ["Straightforward reports and handouts", "Creating a PDF delivery copy from DOCX", "Recovering editable text from a text-based PDF", "Private local conversion on a supported browser"],
    watchFor: ["Scanned PDFs need OCR, which this converter does not claim to perform.", "Password-protected files may fail.", "Complex layout should be compared page by page with the source."],
    privacy: "Conversion happens on the device in the browser. The source file is not uploaded to a Pixores server by this tool, but the downloaded result remains your responsibility to store and share safely.",
    faq: [{ question: "Will a scanned PDF become editable text?", answer: "Not reliably. A scan contains page images and requires OCR; this tool focuses on text-based PDF content." }, { question: "Will the converted file look identical?", answer: "Simple content may transfer well, but layout engines and font availability differ. Always review the entire result." }, { question: "Why can a protected file fail?", answer: "Encryption, permissions, embedded media, forms, and uncommon document structures can prevent browser-side conversion." }],
    related: [{ href: "/jpg-to-pdf", label: "Place a single JPG on a PDF page" }, { href: "/contact", label: "Report a conversion problem" }],
  },
  "youtube-thumbnail-maker": {
    summary: [
      "Pixores Thumbnail Maker is a layer-based workspace for arranging images, text, shapes, frames, backgrounds, and reusable assets on a YouTube-sized canvas. It provides editing controls; it does not promise clicks or substitute for an accurate video idea.",
      "Work from original or licensed assets, keep the visual promise consistent with the video, and review the exported image at mobile size before upload. Saved projects and some assets or AI features can require an account or additional processing.",
    ],
    facts: [{ label: "Canvas", value: "Layer-based thumbnail design" }, { label: "Exports", value: "PNG, JPG, and transparent PNG" }, { label: "Assets", value: "Text, images, shapes, frames, and backgrounds" }, { label: "Workflow", value: "Online editor with saved-project features" }],
    steps: ["Begin with one accurate visual promise for the video.", "Use the 1280 by 720 preset or a custom 3840 by 2160 composition, then place the primary subject first.", "Add short text only when it contributes information the image cannot.", "Review contrast, safe edges, spelling, and asset rights.", "Export and inspect the file around 160 pixels wide before uploading."],
    bestFor: ["YouTube thumbnails", "Layered social graphics", "Reusable branded compositions", "Testing controlled visual variations"],
    watchFor: ["The editor cannot guarantee click-through rate.", "Crowded layouts fail quickly on small screens.", "Misleading claims can attract the wrong viewer and harm satisfaction."],
    privacy: "Local imports are used in the editing workspace. Account saves, cloud assets, AI features, and other connected operations can use Pixores services; avoid sensitive files when those workflows are not appropriate.",
    faq: [{ question: "What thumbnail size should I use?", answer: "YouTube currently recommends 3840 by 2160 pixels at 16:9. Pixores also provides a practical 1280 by 720 preset; use a custom 3840 by 2160 canvas when your source assets support it, and confirm current requirements in YouTube's official help." }, { question: "Should every thumbnail include text?", answer: "No. Use text only when it improves recognition and remains readable at mobile size." }, { question: "How should two versions be tested?", answer: "Change one meaningful variable at a time and evaluate viewer satisfaction alongside clicks." }],
    related: [{ href: "/blog/how-to-create-youtube-thumbnail", label: "Complete thumbnail workflow" }, { href: "/blog/youtube-thumbnail-ab-testing", label: "Design a controlled test" }],
  },
  "video-maker": {
    summary: [
      "Pixores Quick Video Maker is a browser editor for arranging clips, images, audio, text, transitions, and social-video formats on a timeline. It is intended for short creator workflows; the Windows Video Maker Pro is available for larger local projects.",
      "Video export quality depends on source media, project dimensions, frame rate, timing, codec support, and the selected workflow. Play the entire exported file before publication and retain source media outside the project.",
    ],
    facts: [{ label: "Workspace", value: "Timeline-based browser editor" }, { label: "Media", value: "Video, images, audio, and text" }, { label: "Formats", value: "Common landscape, portrait, and square projects" }, { label: "Alternative", value: "Local Windows Pro editor for larger work" }],
    steps: ["Choose the delivery aspect ratio before editing.", "Import original media and keep independent backups.", "Build the rough sequence before polishing text and transitions.", "Check audio levels, captions, safe areas, and cut timing.", "Export, play the whole file, and verify sound and image synchronization."],
    bestFor: ["Short social videos", "Simple timeline assemblies", "Text-overlay and caption workflows", "Trying a project before moving to the Windows editor"],
    watchFor: ["Browser memory and codec support vary by device.", "An editor project is not a backup of source media.", "Every export should be watched outside the editor before upload."],
    privacy: "Media handling depends on the feature and runtime. The Windows Pro editor emphasizes local media and rendering; connected browser features or server rendering can transmit project media. Use only files appropriate for the selected workflow.",
    faq: [{ question: "Which aspect ratio should I choose?", answer: "Match the primary destination before editing: commonly 16:9 for landscape, 9:16 for vertical video, and 1:1 or 4:5 for selected feeds." }, { question: "Why test the exported file?", answer: "Preview and final encoding can differ in timing, codec behavior, audio, or missing media. The exported file is the actual deliverable." }, { question: "When should I use Video Maker Pro?", answer: "Use the Windows editor when local file workflows, larger projects, GPU-assisted rendering, or desktop-specific features are more appropriate." }],
    related: [{ href: "/desktop", label: "Compare Video Maker Pro" }, { href: "/youtube-thumbnail-maker", label: "Create the video's thumbnail" }],
  },
  "presentation-maker": {
    summary: [
      "Pixores Presentation Maker creates 16:9 slide decks with editable titles, supporting text, images, colors, layouts, and themes. Projects are autosaved on the device and can also be exported as a Pixores JSON project for later editing.",
      "PowerPoint export creates an editable PPTX rather than a flat slideshow image. Font substitution and rendering differences can still occur between applications, so the downloaded deck must be reviewed in the software used to present it.",
    ],
    facts: [{ label: "Canvas", value: "16:9 widescreen slides" }, { label: "Project", value: "Local autosave and JSON open/save" }, { label: "Export", value: "Editable PowerPoint PPTX" }, { label: "Preview", value: "Built-in presentation mode" }],
    steps: ["Define the audience and one objective for the deck.", "Create an outline before adding visual polish.", "Use one clear message per slide and keep body text concise.", "Add only licensed or original images and provide sufficient contrast.", "Export the PPTX and review every slide, font, image crop, and page number in PowerPoint-compatible software."],
    bestFor: ["Short widescreen presentations", "Editable pitch or lesson drafts", "Consistent theme-based slides", "Creating a PPTX without uploading project content"],
    watchFor: ["The current layouts are focused templates, not a full desktop publishing system.", "Installed fonts and PowerPoint versions can change line breaks.", "Local autosave is not a substitute for exporting a project backup."],
    privacy: "Presentation editing and project autosave occur on the device. Exported JSON and PPTX files are downloaded locally; uploaded slide images remain part of the in-browser project workflow.",
    faq: [{ question: "Is the PowerPoint file editable?", answer: "Yes. Titles, supporting text, shapes, and supported images are created as PowerPoint elements rather than one flattened screenshot." }, { question: "How do I back up a deck?", answer: "Use Save to download the Pixores JSON project in addition to relying on local autosave, then store that file with the exported PPTX." }, { question: "Why can a font move after export?", answer: "PowerPoint may substitute fonts that are unavailable on the viewing computer, which can change wrapping and spacing." }],
    related: [{ href: "/document-converter", label: "Convert supporting documents" }, { href: "/youtube-thumbnail-maker", label: "Create presentation graphics" }],
  },
} satisfies Record<string, ToolGuide>;
