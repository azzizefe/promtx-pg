import { PrismaClient, UserRole, AIProvider } from '@prisma/client';

// @ts-ignore
declare const process: any;

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Seed Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@promtx.os' },
    update: {},
    create: {
      id: 'system-admin-001',
      email: 'admin@promtx.os',
      displayName: 'Promtx Admin',
      role: UserRole.Admin,
      isEmailVerified: true,
    },
  });
  console.log(`Admin user seeded: ${adminUser.email}`);

  // 2. Seed Admin Wallet
  await prisma.wallet.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      credits: 10000,
      lifetimeCredits: 10000,
    },
  });

  // SuperAdmin User
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@promtx.os' },
    update: {},
    create: {
      email: 'superadmin@promtx.os',
      displayName: 'Promtx SuperAdmin',
      role: UserRole.SuperAdmin,
      isEmailVerified: true,
    },
  });
  console.log(`SuperAdmin user seeded: ${superAdmin.email}`);

  // SuperAdmin Wallet
  await prisma.wallet.upsert({
    where: { userId: superAdmin.id },
    update: {},
    create: {
      userId: superAdmin.id,
      credits: 99999,
      lifetimeCredits: 99999,
    },
  });

  // 3. Seed Global Workspace
  const globalWorkspace = await prisma.workspace.upsert({
    where: { id: 'global-workspace-001' },
    update: {},
    create: {
      id: 'global-workspace-001',
      name: 'Promtx Global',
      slug: 'global',
      ownerId: adminUser.id,
    },
  });
  console.log(`Workspace seeded: ${globalWorkspace.name}`);

  // SuperAdmin Workspace
  const superAdminWorkspace = await prisma.workspace.upsert({
    where: { slug: 'operations' },
    update: {},
    create: {
      name: 'Promtx Operations',
      slug: 'operations',
      ownerId: superAdmin.id,
    },
  });
  console.log(`SuperAdmin workspace seeded: ${superAdminWorkspace.name}`);

  // 4. Seed Workspace Member
  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: globalWorkspace.id,
        userId: adminUser.id,
      },
    },
    update: {},
    create: {
      workspaceId: globalWorkspace.id,
      userId: adminUser.id,
      role: 'Owner',
    },
  });

  // 5. Seed Pricing Matrix
  const gpt4o = await prisma.pricingMatrix.upsert({
    where: { modelId: 'gpt-4o' },
    update: {},
    create: {
      modelId: 'gpt-4o',
      provider: AIProvider.openai,
      basePrice1m: 0.00,
      outputPrice1m: 0.00,
      isActive: true,
    },
  });
  console.log(`Pricing matrix seeded: ${gpt4o.modelId}`);

  const geminiPro = await prisma.pricingMatrix.upsert({
    where: { modelId: 'gemini-1.5-pro' },
    update: {},
    create: {
      modelId: 'gemini-1.5-pro',
      provider: AIProvider.google,
      basePrice1m: 0.00,
      outputPrice1m: 0.00,
      isActive: true,
    },
  });
  console.log(`Pricing matrix seeded: ${geminiPro.modelId}`);

  // 6. Test Users
  const testUsers = [
    { id: 'user-free-001', email: 'free@promtx.os', displayName: 'Free Tier User', role: UserRole.Free, credits: 100 },
    { id: 'user-pro-001', email: 'pro@promtx.os', displayName: 'Pro Creator', role: UserRole.Pro, credits: 2000 },
    { id: 'user-ent-001', email: 'enterprise@promtx.os', displayName: 'Enterprise Studio', role: UserRole.Enterprise, credits: 10000 },
    { id: 'user-des-001', email: 'designer@promtx.os', displayName: 'Fashion Designer', role: UserRole.Pro, credits: 1500 },
    { id: 'user-film-001', email: 'filmmaker@promtx.os', displayName: 'Indie Filmmaker', role: UserRole.Pro, credits: 3000 },
  ];

  for (const u of testUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        isEmailVerified: true,
      }
    });

    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, credits: u.credits, lifetimeCredits: u.credits }
    });

    await prisma.workspace.upsert({
      where: { id: `workspace-${u.id}` },
      update: {},
      create: {
        id: `workspace-${u.id}`,
        name: 'Personal',
        ownerId: user.id,
        slug: `personal-${u.id.split('-')[1]}`,
      }
    });
  }
  console.log('Test users, wallets, workspaces seeded.');

  // 7. System Prompt Templates
  const templates = [
    // Image Studio (5)
    { name: 'Cinematic Portrait', studioType: 'image', category: 'portrait', tags: ['portrait', 'cinematic', 'photography'], templateText: 'A cinematic portrait of {{subject}}, {{lighting}} lighting, {{mood}} mood, shot on {{camera}}, {{style}} style, 8k resolution, detailed skin texture' },
    { name: 'Fantasy Landscape', studioType: 'image', category: 'landscape', tags: ['landscape', 'fantasy', 'environment'], templateText: 'A breathtaking fantasy landscape of {{scene}}, {{time_of_day}}, {{weather}}, epic composition, volumetric lighting, matte painting style, 4k wallpaper quality' },
    { name: 'Product Photography', studioType: 'image', category: 'product', tags: ['product', 'commercial', 'studio'], templateText: '{{product}} product photography, {{background}} background, professional studio lighting, commercial quality, high-end advertising style, sharp focus, {{angle}} angle' },
    { name: 'Anime Character', studioType: 'image', category: 'anime', tags: ['anime', 'character', 'illustration'], templateText: 'Anime style character, {{character_desc}}, {{art_style}} art style, {{background}}, vibrant colors, detailed eyes, by {{artist_reference}}' },
    { name: 'Architecture Visualization', studioType: 'image', category: 'architecture', tags: ['architecture', 'render', '3d'], templateText: 'Architectural visualization of {{building_type}}, {{style}} style, {{material}} facade, {{time}} lighting, photorealistic render, unreal engine quality' },

    // Video Studio (5)
    { name: 'Cinematic Scene', studioType: 'video', category: 'film', tags: ['cinematic', 'scene', 'film'], templateText: 'Cinematic scene: {{scene_description}}, camera {{camera_movement}}, {{mood}} atmosphere, film grain, anamorphic lens' },
    { name: 'Social Media Clip', studioType: 'video', category: 'social', tags: ['social', 'short-form', 'trendy'], templateText: 'Trendy social media video: {{content}}, vertical format 9:16, vibrant colors, fast-paced editing, {{platform}} style' },
    { name: 'Drone Landscape', studioType: 'video', category: 'landscape', tags: ['drone', 'flyover', 'aerial'], templateText: 'Aerial drone flyover of {{location}}, smooth camera movement, cinematic lighting, 4k 60fps, {{time_of_day}}' },
    { name: 'Time-Lapse City', studioType: 'video', category: 'city', tags: ['timelapse', 'urban', 'hyperlapse'], templateText: 'Hyper-lapse time-lapse of {{city_name}}, traffic trails, moving clouds, transition from day to night, volumetric light' },
    { name: 'Slow Motion Liquid', studioType: 'video', category: 'abstract', tags: ['slowmo', 'macro', 'liquid'], templateText: 'Macro slow motion video of {{liquid_type}} splashing, 1000fps, extreme detail, colorful reflections, studio lighting' },

    // Cinema Studio (5)
    { name: 'Screenplay Act', studioType: 'cinema', category: 'writing', tags: ['screenplay', 'script', 'cinema'], templateText: 'Write a screenplay scene set in {{location}}. Action: {{action_desc}}. Character A: {{char_a}}. Character B: {{char_b}}. Include dialogue and emotional beats.' },
    { name: 'Scene Setup', studioType: 'cinema', category: 'production', tags: ['scene', 'setup', 'directing'], templateText: 'Establish a cinema scene for {{setting}}. Camera angle: {{angle}}. Lighting: {{lighting_setup}}. Atmosphere: {{atmosphere_type}}.' },
    { name: 'Storyboard Frame', studioType: 'cinema', category: 'pre-production', tags: ['storyboard', 'drawing', 'frame'], templateText: 'Storyboard frame for {{action}}. Subject: {{subject}}. Composition: {{shot_type}}. Style: {{drawing_style}}.' },
    { name: 'Character Arc', studioType: 'cinema', category: 'writing', tags: ['character', 'arc', 'story'], templateText: 'Develop a character arc for {{character_name}}. Background: {{background}}. Conflict: {{conflict}}. Resolution: {{resolution}}.' },
    { name: 'Climax Sequence', studioType: 'cinema', category: 'writing', tags: ['climax', 'action', 'finale'], templateText: 'Write the final climax sequence of a {{genre}} film. Key event: {{key_event}}. High stakes: {{stakes}}.' },

    // Audio Studio (5)
    { name: 'Podcast Intro', studioType: 'audio', category: 'podcast', tags: ['podcast', 'intro', 'music'], templateText: 'Create a {{duration}} second podcast intro: {{style}} music, {{mood}} tone, professional quality, with a subtle sound effect at the end' },
    { name: 'Lo-Fi Beat', studioType: 'audio', category: 'music', tags: ['lofi', 'chill', 'relax'], templateText: 'Generate a chill lo-fi beat. Tempo: {{bpm}} BPM. Instruments: {{instruments}}. Vibe: {{vibe_desc}}.' },
    { name: 'Voiceover Hook', studioType: 'audio', category: 'voice', tags: ['voice', 'hook', 'narration'], templateText: 'Record a professional voiceover hook for {{topic}}. Voice type: {{voice_type}}. Pacing: {{pacing}}.' },
    { name: 'Sound Effect FX', studioType: 'audio', category: 'sfx', tags: ['sfx', 'effect', 'sound'], templateText: 'Synthesize a sound effect for {{event}}. Type: {{sfx_type}}. Duration: {{duration_seconds}}s.' },
    { name: 'Ambient Drone', studioType: 'audio', category: 'music', tags: ['ambient', 'drone', 'space'], templateText: 'Compose a deep ambient drone track. Texture: {{texture}}. Mood: {{mood_type}}.' },

    // Character/Persona Studio (5)
    { name: 'OC Reference', studioType: 'character', category: 'persona', tags: ['oc', 'reference', 'art'], templateText: 'Character design sheet for {{name}}. Species: {{species}}. Outfit: {{outfit}}. Personality: {{traits}}.' },
    { name: 'D&D NPC', studioType: 'character', category: 'rpg', tags: ['npc', 'dnd', 'fantasy'], templateText: 'Generate a rich D&D NPC. Name: {{npc_name}}. Role: {{role}}. Quirk: {{quirk}}. Stat focus: {{stats}}.' },
    { name: 'VTuber Avatar', studioType: 'character', category: 'avatar', tags: ['vtuber', 'anime', 'streamer'], templateText: 'Design a VTuber avatar. Theme: {{theme}}. Hair color: {{hair}}. Accessory: {{accessory}}.' },
    { name: 'Cyberpunk Hero', studioType: 'character', category: 'scifi', tags: ['cyberpunk', 'hero', 'tech'], templateText: 'Create a cyberpunk hero named {{name}}. Cybernetics: {{cybernetics}}. Weapon: {{weapon}}.' },
    { name: 'Fantasy Wizard', studioType: 'character', category: 'fantasy', tags: ['wizard', 'mage', 'spell'], templateText: 'Design an ancient wizard. Magic type: {{magic_school}}. Staff design: {{staff}}.' },

    // Fashion Studio (5)
    { name: 'Streetwear Outfit', studioType: 'fashion', category: 'style', tags: ['streetwear', 'urban', 'outfit'], templateText: 'Design a streetwear outfit. Top: {{top}}. Bottom: {{bottom}}. Shoes: {{shoes}}. Accessories: {{acc}}.' },
    { name: 'Haute Couture', studioType: 'fashion', category: 'high-fashion', tags: ['couture', 'runway', 'luxury'], templateText: 'Create a haute couture gown. Material: {{material}}. Color: {{color}}. Silhouette: {{silhouette}}.' },
    { name: 'Minimalist Lookbook', studioType: 'fashion', category: 'lookbook', tags: ['minimal', 'chic', 'capsule'], templateText: 'Build a capsule wardrobe look. Core pieces: {{pieces}}. Aesthetic: {{aesthetic}}.' },
    { name: 'Futuristic Techwear', studioType: 'fashion', category: 'scifi', tags: ['techwear', 'scifi', 'functional'], templateText: 'Design technical apparel. Utility features: {{utilities}}. Fabric: {{fabric}}.' },
    { name: 'Vintage Glamour', studioType: 'fashion', category: 'retro', tags: ['vintage', 'glam', 'retro'], templateText: 'Recreate a {{decade}}s fashion look. Key elements: {{elements}}.' },

    // Marketing Studio (5)
    { name: 'Ad Copy Hook', studioType: 'marketing', category: 'copy', tags: ['ad', 'copy', 'sales'], templateText: 'Write an attention-grabbing ad hook for {{product}}. Target audience: {{audience}}.' },
    { name: 'IG Reel Script', studioType: 'marketing', category: 'social', tags: ['instagram', 'reel', 'script'], templateText: 'Script a 15-second IG Reel. Hook: {{hook}}. Content: {{content}}. Call to action: {{cta}}.' },
    { name: 'LinkedIn Post', studioType: 'marketing', category: 'business', tags: ['linkedin', 'post', 'professional'], templateText: 'Draft a professional LinkedIn post about {{topic}}. Key takeaway: {{takeaway}}.' },
    { name: 'Product Tagline', studioType: 'marketing', category: 'branding', tags: ['tagline', 'branding', 'slogan'], templateText: 'Generate 5 memorable taglines for {{brand_name}}. Tone: {{tone}}.' },
    { name: 'Email Newsletter', studioType: 'marketing', category: 'email', tags: ['newsletter', 'email', 'sales'], templateText: 'Write a marketing email promoting {{sale_item}}. Discount: {{discount}}.' },

    // Edit Studio (5)
    { name: 'Color Grading Look', studioType: 'edit', category: 'grading', tags: ['color', 'grading', 'cinematic'], templateText: 'Apply a color grade to raw footage. Style: {{style_name}}. LUT vibe: {{lut_vibe}}.' },
    { name: 'Style Transfer Art', studioType: 'edit', category: 'art', tags: ['style', 'transfer', 'painting'], templateText: 'Transform the input image into the art style of {{artist}}.' },
    { name: 'Background Blur', studioType: 'edit', category: 'bokeh', tags: ['blur', 'bokeh', 'portrait'], templateText: 'Isolate the subject and add a soft {{bokeh_style}} bokeh effect to the background.' },
    { name: 'Upscale & Enhance', studioType: 'edit', category: 'enhance', tags: ['upscale', 'enhance', 'detail'], templateText: 'Restore clarity and add high-frequency details to this low-res image.' },
    { name: 'Retro VHS Effect', studioType: 'edit', category: 'retro', tags: ['vhs', 'glitch', 'retro'], templateText: 'Apply a 90s VHS tape effect, including tracking lines, chromatic aberration, and color bleed.' },
  ];

  for (const t of templates) {
    await prisma.promptTemplate.upsert({
      where: {
        id: `system-template-${t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      },
      update: {},
      create: {
        id: `system-template-${t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: t.name,
        studioType: t.studioType as any,
        category: t.category,
        tags: t.tags,
        templateText: t.templateText,
        isSystem: true,
        isPublic: true,
      }
    });
  }
  console.log('40 system prompt templates seeded.');

  console.log('Seeding complete.');

}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
