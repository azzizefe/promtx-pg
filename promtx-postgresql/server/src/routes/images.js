export async function handleImageGenerate(req, headers) {
    return new Response(JSON.stringify({
        status: 'success',
        imageUrl: 'https://promtx.os/assets/mock_generated_image.png',
        generationId: 'gen-001'
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
    });
}
export async function handleImageVariation(req, headers) {
    return new Response(JSON.stringify({
        status: 'success',
        imageUrl: 'https://promtx.os/assets/mock_variation_image.png'
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
    });
}
export async function handleImageOutpaint(req, headers) {
    return new Response(JSON.stringify({
        status: 'success',
        imageUrl: 'https://promtx.os/assets/mock_outpainted_image.png'
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
    });
}
export async function handleImageGallery(req, headers) {
    const mockGallery = [
        { id: 'img-1', url: 'https://promtx.os/assets/mock1.png', isPublic: false },
        { id: 'img-2', url: 'https://promtx.os/assets/mock2.png', isPublic: true },
    ];
    return new Response(JSON.stringify(mockGallery), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
    });
}
export async function handleImagePublic(req, headers) {
    const mockPublicGallery = [
        { id: 'img-2', url: 'https://promtx.os/assets/mock2.png', isPublic: true },
    ];
    return new Response(JSON.stringify(mockPublicGallery), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
    });
}
export async function handleImageUpdatePublic(req, headers) {
    return new Response(JSON.stringify({ status: 'success', isPublic: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
    });
}
export async function handleImageShare(req, headers) {
    return new Response(JSON.stringify({ shareUrl: 'https://promtx.os/share/mock-img-001' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
    });
}
export async function handleImageUpscale(req, headers) {
    return new Response(JSON.stringify({
        status: 'success',
        imageUrl: 'https://promtx.os/assets/mock_upscaled_image.png'
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
    });
}
