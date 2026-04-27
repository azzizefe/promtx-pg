import { PrismaClient, UserRole, AIProvider } from '@prisma/client';
import argon2 from 'argon2';

// @ts-ignore
declare const process: any;

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Common password for all seed users: "test1234"
  const defaultPasswordHash = await argon2.hash('test1234');

  // 1. Seed Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@promtx.os' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      id: 'system-admin-001',
      email: 'admin@promtx.os',
      passwordHash: defaultPasswordHash,
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
    update: { passwordHash: defaultPasswordHash },
    create: {
      email: 'superadmin@promtx.os',
      passwordHash: defaultPasswordHash,
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
      update: { passwordHash: defaultPasswordHash },
      create: {
        id: u.id,
        email: u.email,
        passwordHash: defaultPasswordHash,
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

  // 8. Model Pricing & Legacy Mappings (Raw SQL due to client lock)
  await prisma.$executeRawUnsafe(`
    INSERT INTO pricing_matrix (model_id, provider, base_price_1m, output_price_1m, is_active)
    VALUES
      ('gpt-4o', 'openai', 5.0, 15.0, true),
      ('gpt-3.5-turbo', 'openai', 0.5, 1.5, true),
      ('gemini-1.5-flash', 'google', 0.075, 0.3, true),
      ('gemini-1.5-pro', 'google', 3.5, 10.5, true),
      ('gemini-2.0-flash', 'google', 0.1, 0.4, true),
      ('deepseek-chat', 'local', 0.1, 0.2, true),
      ('grok-1', 'local', 0.5, 1.5, true),
      ('dall-e-3', 'openai', 40000.0, 80000.0, true)
    ON CONFLICT (model_id) DO UPDATE SET
      provider = EXCLUDED.provider,
      base_price_1m = EXCLUDED.base_price_1m,
      output_price_1m = EXCLUDED.output_price_1m,
      is_active = EXCLUDED.is_active;
  `);
  console.log('Model pricing matrix seeded.');

  await prisma.$executeRawUnsafe(`
    INSERT INTO model_mappings (old_id, new_id)
    VALUES
      ('text-davinci-003', 'gpt-3.5-turbo'),
      ('gpt-4', 'gpt-4o'),
      ('gpt-4-turbo', 'gpt-4o'),
      ('gemini-pro', 'gemini-1.5-pro'),
      ('gemini-ultra', 'gemini-1.5-pro'),
      ('gemini-3flash', 'gemini-1.5-flash')
    ON CONFLICT (old_id) DO UPDATE SET
      new_id = EXCLUDED.new_id;
  `);
  console.log('Model mappings seeded.');

  // 9. Promo Codes
  const promoCodes = [
    { code: 'WELCOME2026', discountPercent: 20, maxUses: 1000, validUntil: new Date('2026-12-31'), isActive: true },
    { code: 'PROMTXBETA', discountAmount: 5.00, maxUses: 500, validUntil: new Date('2026-06-30'), isActive: true },
    { code: 'FREECREDITS50', discountAmount: 50.00, maxUses: 100, validUntil: new Date('2026-12-31'), isActive: true, metadata: { type: 'credit_bonus', note: 'Beta tester reward' } },
    { code: 'INFLUENCER100', discountPercent: 100, maxUses: 10, validUntil: new Date('2026-12-31'), isActive: true, metadata: { type: 'influencer', note: 'Influencer partnership' } },
    { code: 'STARTUP2026', discountPercent: 50, maxUses: 200, validUntil: new Date('2026-09-30'), isActive: true },
  ];

  for (const p of promoCodes) {
    await prisma.promoCode.upsert({
      where: { code: p.code },
      update: {},
      create: {
        code: p.code,
        discountPercent: p.discountPercent || null,
        discountAmount: p.discountAmount || null,
        maxUses: p.maxUses,
        validUntil: p.validUntil,
        isActive: p.isActive,
        metadata: p.metadata || {},
      }
    });
  }
  console.log('Promo codes seeded.');

  // 10. Example Conversations & Messages
  // sample-conv-001
  await prisma.conversation.upsert({
    where: { id: 'sample-conv-001' },
    update: {},
    create: {
      id: 'sample-conv-001',
      title: 'System Integration Test',
      userId: 'system-admin-001',
      workspaceId: 'global-workspace-001',
    }
  });

  await prisma.message.upsert({
    where: { id: 'msg-001' },
    update: {},
    create: { id: 'msg-001', conversationId: 'sample-conv-001', role: 'system', content: 'You are a helpful AI assistant.' }
  });

  await prisma.message.upsert({
    where: { id: 'msg-002' },
    update: {},
    create: { id: 'msg-002', conversationId: 'sample-conv-001', role: 'user', content: 'Run the database verification checklist.' }
  });

  const sampleConversations = [
    {
      title: 'Cinematic Portrait Session',
      studioType: 'image',
      userId: 'user-pro-001',
      messages: [
        { role: 'user', content: 'Create a cinematic portrait: young woman, neon-lit Tokyo alley, rain reflections, 85mm lens, f/1.4' },
        { role: 'assistant', content: 'A cinematic portrait photograph of a young woman standing in a neon-lit Tokyo alleyway during rainfall. Shot on 85mm f/1.4 lens, shallow depth of field, rain droplets catching cyan and magenta neon reflections. Wet pavement reflecting light, volumetric mist, film grain texture, Blade Runner inspired color grading, 8K resolution.' },
      ],
    },
    {
      title: 'Product Launch Video Concept',
      studioType: 'video',
      userId: 'user-ent-001',
      messages: [
        { role: 'user', content: 'Create a 30-second product reveal video concept for a sleek AI device' },
        { role: 'assistant', content: 'Opening shot: extreme close-up of glossy black surface, camera slowly pulls back revealing...' },
      ],
    },
    {
      title: 'Sci-Fi Character Design',
      studioType: 'character',
      userId: 'user-pro-001',
      messages: [
        { role: 'user', content: 'Design a cyberpunk bounty hunter character, female, age 25-35, athletic build' },
        { role: 'assistant', content: 'Cyberpunk bounty hunter: athletic female, 28 years old, mixed ethnicity. Neon-violet cybernetic left eye, short asymmetric black hair with holographic streaks. Tactical matte-black bodysuit with orange accents...' },
      ],
    },
    {
      title: 'Summer Collection Lookbook',
      studioType: 'fashion',
      userId: 'user-des-001',
      messages: [
        { role: 'user', content: 'Generate a fashion lookbook concept: minimalist summer streetwear, Mediterranean setting' },
        { role: 'assistant', content: 'Mediterranean Minimalist Summer Collection: Oversized linen shirt in sand beige, high-waisted wide-leg trousers in cream...' },
      ],
    },
    {
      title: 'Short Film Scene',
      studioType: 'cinema',
      userId: 'user-film-001',
      messages: [
        { role: 'user', content: 'Write a scene: detective enters abandoned warehouse, discovers a clue, cinematic noir style' },
        { role: 'assistant', content: 'INT. ABANDONED WAREHOUSE - NIGHT\n\nShafts of moonlight cut through broken skylights. DETECTIVE KARA (40s, weathered) pushes open the rusted door...' },
      ],
    },
  ];

  for (let i = 0; i < sampleConversations.length; i++) {
    const sc = sampleConversations[i];
    // Delete first to be idempotent in creation
    await prisma.conversation.deleteMany({ where: { id: `sample-conv-studio-${i}` } });

    const conv = await prisma.conversation.create({
      data: {
        id: `sample-conv-studio-${i}`,
        title: sc.title,
        userId: sc.userId,
        studioType: sc.studioType as any,
      }
    });

    for (let j = 0; j < sc.messages.length; j++) {
      const msg = sc.messages[j];
      await prisma.message.create({
        data: {
          id: `sample-msg-studio-${i}-${j}`,
          conversationId: conv.id,
          role: msg.role,
          content: msg.content,
        }
      });
    }
  }
  console.log('Sample conversations and messages seeded.');

  // 11. DNA Vaults
  const sampleDna = [
    {
      name: 'Photorealistic Portrait DNA',
      description: 'Yuksek kaliteli fotorealist portre ayarlari',
      studioType: 'image',
      userId: 'user-pro-001',
      dnaJson: {
        gender: 'female',
        age: '25-35',
        ethnicity: 'Mediterranean',
        hairColor: 'Brown',
        hairStyle: 'Wavy',
        eyeColor: 'Green',
        bodyType: 'Athletic',
        complexion: 'Olive',
        expression: 'Confident',
        style: 'photorealistic',
        quality: 'ultra_high',
        lighting: 'studio',
        camera: { model: 'Canon EOS R5', lens: '85mm f/1.4', iso: 100 },
        negativePrompts: ['cartoon', 'anime', 'illustration', 'low quality'],
      },
      isDefault: true,
    },
    {
      name: 'Cyberpunk Character DNA',
      description: 'Cyberpunk tarz karakter DNA profili',
      studioType: 'character',
      userId: 'user-pro-001',
      dnaJson: {
        gender: 'female',
        age: '18-25',
        ethnicity: 'East Asian',
        hairColor: 'Neon',
        hairStyle: 'Short',
        eyeColor: 'Blue',
        bodyType: 'Athletic',
        complexion: 'Fair',
        tattoo: 'Circuit patterns on arms',
        piercing: 'Cybernetic ear implants',
        makeup: 'Holographic lip gloss, neon eyeliner',
        visualStyle: 'cyberpunk',
        aesthetic: 'neon-noir',
        personality: 'Rebellious',
        archetype: 'Hacker',
      },
      isDefault: false,
    },
    {
      name: 'High Fashion Model DNA',
      description: 'Moda studiosu icin model profili',
      studioType: 'fashion',
      userId: 'user-des-001',
      dnaJson: {
        gender: 'female',
        age: '18-25',
        ethnicity: 'Nordic',
        hairColor: 'Blonde',
        hairStyle: 'Straight',
        eyeColor: 'Blue',
        bodyType: 'Thin',
        complexion: 'Porcelain',
        expression: 'Stoic',
        clothingStyle: 'Avant-garde',
        fabric: 'Silk, Leather',
        footwear: 'Stiletto heels',
        nails: 'Minimalist French tips',
        makeup: 'Editorial bold lips',
      },
      isDefault: false,
    },
    {
      name: 'Anime Art DNA',
      description: 'Anime tarz cizim ayarlari',
      studioType: 'image',
      userId: 'user-free-001',
      dnaJson: {
        style: 'anime',
        quality: 'high',
        lineWeight: 'medium',
        colorPalette: 'vibrant',
        influence: ['Studio Ghibli', 'Makoto Shinkai'],
        eyeColor: 'Violet',
        hairColor: 'Pink',
        hairStyle: 'Long',
      },
      isDefault: false,
    },
    {
      name: 'Cinematic Video DNA',
      description: 'Film kalitesinde video ayarlari',
      studioType: 'cinema',
      userId: 'user-film-001',
      dnaJson: {
        aspectRatio: '2.39:1',
        colorGrading: 'teal_orange',
        frameRate: 24,
        grain: 'subtle',
        lens: 'anamorphic',
      },
      isDefault: false,
    },
  ];

  for (const d of sampleDna) {
    await prisma.dnaVault.upsert({
      where: {
        userId_name: {
          userId: d.userId,
          name: d.name,
        }
      },
      update: {},
      create: {
        userId: d.userId,
        name: d.name,
        description: d.description,
        studioType: d.studioType as any,
        dnaJson: d.dnaJson,
        isDefault: d.isDefault,
      }
    });
  }
  console.log('DNA vaults seeded.');

  // 12. Notifications
  const testUserIds = ['user-free-001', 'user-pro-001', 'user-ent-001', 'user-des-001', 'user-film-001'];
  const sampleNotifications = [
    { type: 'system', title: 'Promtx\'e Hosgeldiniz!', body: 'AI destekli prompt muhendisligi platformuna hosgeldiniz. Baslamak icin bir studio secin.', data: { action: 'navigate', target: '/studio' } },
    { type: 'billing', title: 'Hosgeldin Kredisi', body: 'Hesabiniza 500 kredi hosgeldin bonusu eklendi.', data: { credits: 500 } },
    { type: 'generation', title: 'Ilk Gorseli Olusturun', body: 'Image Studio ile ilk AI gorselinizi olusturmaya hazir misiniz?', data: { action: 'navigate', target: '/studio/image' } },
  ];

  for (const userId of testUserIds) {
    for (let i = 0; i < sampleNotifications.length; i++) {
      const n = sampleNotifications[i];
      await prisma.notification.upsert({
        where: { id: `sample-notif-${userId}-${i}` },
        update: {},
        create: {
          id: `sample-notif-${userId}-${i}`,
          userId,
          type: n.type as any,
          title: n.title,
          body: n.body,
          data: n.data,
        }
      });
    }
  }
  console.log('Notifications seeded.');

  // 13. Referrals
  const sampleReferrals = [
    { referrerId: 'user-pro-001', referredId: 'user-free-001', code: 'PRO123', credits: 100, status: 'completed' },
    { referrerId: 'user-ent-001', referredId: 'user-des-001', code: 'ENT999', credits: 500, status: 'pending' },
    { referrerId: 'user-ent-001', referredId: 'user-film-001', code: 'ENT999', credits: 500, status: 'completed' },
  ];

  for (const r of sampleReferrals) {
    await prisma.referral.upsert({
      where: { referrerId_referredId: { referrerId: r.referrerId, referredId: r.referredId } },
      update: {},
      create: {
        referrerId: r.referrerId,
        referredId: r.referredId,
        referralCode: r.code,
        rewardCredits: r.credits,
        status: r.status,
        completedAt: r.status === 'completed' ? new Date() : null,
      }
    });
  }
  console.log('Referrals seeded.');

  // 14. OAuth Provider Configs
  const oauthProviders = [
    {
      provider: 'google',
      clientId: process.env.GOOGLE_CLIENT_ID || 'SEED_PLACEHOLDER_GOOGLE_CLIENT_ID',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'SEED_PLACEHOLDER',
      scopes: ['openid', 'email', 'profile'],
      isActive: true,
      metadata: {
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
        jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
        supportsPKCE: true,
        supportsRefreshToken: true,
      },
    },
    {
      provider: 'apple',
      clientId: process.env.APPLE_CLIENT_ID || 'com.promtx.auth',
      clientSecret: 'DYNAMIC_JWT',
      teamId: process.env.APPLE_TEAM_ID || 'SEED_PLACEHOLDER',
      keyId: process.env.APPLE_KEY_ID || 'SEED_PLACEHOLDER',
      privateKey: process.env.APPLE_PRIVATE_KEY || null,
      scopes: ['name', 'email'],
      isActive: true,
      metadata: {
        authorizationUrl: 'https://appleid.apple.com/auth/authorize',
        tokenUrl: 'https://appleid.apple.com/auth/token',
        jwksUrl: 'https://appleid.apple.com/auth/keys',
        revokeUrl: 'https://appleid.apple.com/auth/revoke',
        responseMode: 'form_post',
        usesNonce: true,
        supportsRefreshToken: false,
        firstLoginOnlyUserInfo: true,
      },
    },
    {
      provider: 'microsoft',
      clientId: process.env.MICROSOFT_CLIENT_ID || 'SEED_PLACEHOLDER_MICROSOFT_CLIENT_ID',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || 'SEED_PLACEHOLDER',
      tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
      scopes: ['openid', 'email', 'profile', 'User.Read'],
      isActive: true,
      metadata: {
        authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        jwksUrl: 'https://login.microsoftonline.com/common/discovery/v2.0/keys',
        graphUrl: 'https://graph.microsoft.com/v1.0/me',
        graphPhotoUrl: 'https://graph.microsoft.com/v1.0/me/photo/$value',
        supportsPKCE: true,
        supportsRefreshToken: true,
        multiTenant: true,
      },
    },
  ];

  for (const config of oauthProviders) {
    await prisma.oAuthProviderConfig.upsert({
      where: { provider: config.provider as any },
      update: {
        scopes: config.scopes,
        isActive: config.isActive,
        metadata: config.metadata,
      },
      create: {
        provider: config.provider as any,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        teamId: config.teamId || null,
        keyId: config.keyId || null,
        privateKey: config.privateKey || null,
        tenantId: config.tenantId || null,
        scopes: config.scopes,
        isActive: config.isActive,
        metadata: config.metadata,
      },
    });
  }
  console.log('OAuth provider configs seeded.');

  // 15. Test OAuth Accounts
  // Pro user -> Google
  await prisma.account.upsert({
    where: { provider_providerAccountId: { provider: 'google', providerAccountId: 'google-test-uid-001' } },
    update: {},
    create: {
      userId: 'user-pro-001',
      provider: 'google',
      providerAccountId: 'google-test-uid-001',
      accessToken: 'mock-google-access-token-pro',
      refreshToken: 'mock-google-refresh-token-pro',
      expiresAt: new Date(Date.now() + 3600 * 1000),
      tokenType: 'Bearer',
      scope: 'openid email profile',
      providerEmail: 'procreator@gmail.com',
      providerName: 'Pro Creator',
      providerAvatar: 'https://lh3.googleusercontent.com/a/mock-pro-avatar',
      metadata: { hd: null, email_verified: true },
    },
  });

  // Enterprise user -> Microsoft
  await prisma.account.upsert({
    where: { provider_providerAccountId: { provider: 'microsoft', providerAccountId: 'microsoft-test-oid-001' } },
    update: {},
    create: {
      userId: 'user-ent-001',
      provider: 'microsoft',
      providerAccountId: 'microsoft-test-oid-001',
      accessToken: 'mock-ms-access-token-ent',
      refreshToken: 'mock-ms-refresh-token-ent',
      expiresAt: new Date(Date.now() + 3600 * 1000),
      tokenType: 'Bearer',
      scope: 'openid email profile User.Read',
      providerEmail: 'enterprise@contoso.com',
      providerName: 'Enterprise Studio',
      metadata: {
        tenant_id: 'contoso-tenant-id',
        job_title: 'Creative Director',
        office_location: 'Istanbul',
      },
    },
  });

  // Designer user -> Apple
  await prisma.account.upsert({
    where: { provider_providerAccountId: { provider: 'apple', providerAccountId: 'apple-test-sub-001' } },
    update: {},
    create: {
      userId: 'user-des-001',
      provider: 'apple',
      providerAccountId: 'apple-test-sub-001',
      idToken: 'mock-apple-id-token-designer',
      providerEmail: 'abc123@privaterelay.appleid.com',
      providerName: 'Fashion Designer',
      metadata: {
        is_private_email: true,
        real_user_status: 2,
        nonce_supported: true,
      },
    },
  });

  // Filmmaker user -> Google & Apple
  await prisma.account.upsert({
    where: { provider_providerAccountId: { provider: 'google', providerAccountId: 'google-test-uid-002' } },
    update: {},
    create: {
      userId: 'user-film-001',
      provider: 'google',
      providerAccountId: 'google-test-uid-002',
      accessToken: 'mock-google-access-token-film',
      providerEmail: 'filmmaker@gmail.com',
      providerName: 'Indie Filmmaker',
      metadata: { email_verified: true },
    },
  });

  await prisma.account.upsert({
    where: { provider_providerAccountId: { provider: 'apple', providerAccountId: 'apple-test-sub-002' } },
    update: {},
    create: {
      userId: 'user-film-001',
      provider: 'apple',
      providerAccountId: 'apple-test-sub-002',
      idToken: 'mock-apple-id-token-film',
      providerEmail: 'def456@privaterelay.appleid.com',
      providerName: 'Indie Filmmaker',
      metadata: { is_private_email: true, real_user_status: 2 },
    },
  });

  // Admin user -> Google, Apple, Microsoft
  const adminProviders = [
    { provider: 'google', providerAccountId: 'google-admin-uid', providerEmail: 'admin@gmail.com' },
    { provider: 'apple', providerAccountId: 'apple-admin-sub', providerEmail: 'admin-relay@privaterelay.appleid.com' },
    { provider: 'microsoft', providerAccountId: 'ms-admin-oid', providerEmail: 'admin@promtx.onmicrosoft.com' },
  ];

  for (const p of adminProviders) {
    await prisma.account.upsert({
      where: { provider_providerAccountId: { provider: p.provider as any, providerAccountId: p.providerAccountId } },
      update: {},
      create: {
        userId: 'system-admin-001',
        provider: p.provider as any,
        providerAccountId: p.providerAccountId,
        providerEmail: p.providerEmail,
        providerName: 'Promtx Admin',
        metadata: { is_test_account: true },
      },
    });
  }
  console.log('Test OAuth accounts linked.');

  // 16. Token Usage Seeds
  const realModels = [
    { modelId: 'gemini-1.5-flash', provider: 'google' },
    { modelId: 'gemini-1.5-pro',   provider: 'google' },
    { modelId: 'gpt-4o',           provider: 'openai' },
    { modelId: 'gpt-3.5-turbo',    provider: 'openai' },
    { modelId: 'deepseek-chat',    provider: 'local' },
    { modelId: 'grok-1',           provider: 'local' },
    { modelId: 'dall-e-3',         provider: 'openai' },
  ];

  const randomUsers = ['user-free-001', 'user-pro-001', 'user-ent-001', 'user-des-001', 'user-film-001'];
  const randomStudios = ['image', 'video', 'cinema', 'audio', 'character', 'fashion', 'marketing', 'edit'];

  // Clear existing usage to prevent endless bloat
  await prisma.tokenUsage.deleteMany({ where: { id: { startsWith: 'sample-usage-' } } });

  for (let i = 0; i < 100; i++) {
    const model = realModels[Math.floor(Math.random() * realModels.length)];
    const userId = randomUsers[Math.floor(Math.random() * randomUsers.length)];
    const studioType = randomStudios[Math.floor(Math.random() * randomStudios.length)];

    const inputTokens = Math.floor(Math.random() * 4900) + 100;
    const outputTokens = Math.floor(Math.random() * 2950) + 50;
    const costUsd = (Math.random() * 0.499) + 0.001;
    const latencyMs = Math.floor(Math.random() * 4800) + 200;

    const randomDaysAgo = Math.floor(Math.random() * 30);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - randomDaysAgo);

    await prisma.tokenUsage.create({
      data: {
        id: `sample-usage-${i}`,
        userId,
        modelId: model.modelId,
        provider: model.provider as any,
        studioType: studioType as any,
        inputTokens,
        outputTokens,
        costUsd,
        latencyMs,
        createdAt,
      }
    });
  }
  console.log('100 sample token usage analytics seeded.');

  // 17. IAP Products (Raw SQL)
  await prisma.$executeRawUnsafe(`
    INSERT INTO iap_products (id, product_id, platform, amount, currency)
    VALUES
      ('iap-pro-monthly', 'com.promtx.pro.monthly', 'stripe', 9.99, 'USD'),
      ('iap-pro-yearly', 'com.promtx.pro.yearly', 'stripe', 99.99, 'USD'),
      ('iap-ent-monthly', 'com.promtx.ent.monthly', 'stripe', 49.99, 'USD'),
      ('iap-credits-100', 'com.promtx.credits.100', 'stripe', 4.99, 'USD'),
      ('iap-credits-500', 'com.promtx.credits.500', 'stripe', 19.99, 'USD'),
      ('iap-credits-1000', 'com.promtx.credits.1000', 'stripe', 34.99, 'USD')
    ON CONFLICT (product_id) DO UPDATE SET
      platform = EXCLUDED.platform,
      amount = EXCLUDED.amount,
      currency = EXCLUDED.currency;
  `);
  console.log('IAP Products seeded.');

  // 18. Seed Subscriptions for Test Users
  console.log('Seeding subscriptions for test users...');
  
  // Admin: Studio Pro (active)
  await prisma.subscription.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      stripeCustomerId: 'cus_admin_test_001',
      stripeSubscriptionId: 'sub_admin_test_001',
      stripePriceId: 'price_studio_pro_monthly',
      plan: 'studio_pro',
      billingCycle: 'monthly',
      status: 'active',
      currentPeriodStart: new Date('2026-04-01'),
      currentPeriodEnd: new Date('2026-05-01'),
      monthlyCredits: 15000,
      creditsUsedThisPeriod: 1500,
    }
  });

  // Pro user: Creator yearly (active)
  await prisma.subscription.upsert({
    where: { userId: 'user-pro-001' },
    update: {},
    create: {
      userId: 'user-pro-001',
      stripeCustomerId: 'cus_pro_test_001',
      stripeSubscriptionId: 'sub_pro_test_001',
      stripePriceId: 'price_creator_yearly',
      plan: 'creator',
      billingCycle: 'yearly',
      status: 'active',
      currentPeriodStart: new Date('2026-01-01'),
      currentPeriodEnd: new Date('2027-01-01'),
      monthlyCredits: 5000,
      creditsUsedThisPeriod: 200,
    }
  });

  // Free user: Starter (has Stripe customer, no subscription)
  await prisma.subscription.upsert({
    where: { userId: 'user-free-001' },
    update: {},
    create: {
      userId: 'user-free-001',
      stripeCustomerId: 'cus_free_test_001',
      plan: 'starter',
      status: 'active',
      monthlyCredits: 100,
      creditsUsedThisPeriod: 50,
    }
  });

  // Designer: Creator (cancel_at_period_end = true)
  await prisma.subscription.upsert({
    where: { userId: 'user-des-001' },
    update: {},
    create: {
      userId: 'user-des-001',
      stripeCustomerId: 'cus_des_test_001',
      stripeSubscriptionId: 'sub_des_test_001',
      stripePriceId: 'price_creator_monthly',
      plan: 'creator',
      billingCycle: 'monthly',
      status: 'active',
      currentPeriodStart: new Date('2026-04-01'),
      currentPeriodEnd: new Date('2026-05-01'),
      cancelAtPeriodEnd: true,
      monthlyCredits: 5000,
      creditsUsedThisPeriod: 4000,
    }
  });

  // SubscriptionHistory examples (upgrade + downgrade)
  await prisma.subscriptionHistory.deleteMany({});
  await prisma.subscriptionHistory.createMany({
    data: [
      {
        userId: 'user-pro-001',
        fromPlan: 'starter',
        toPlan: 'creator',
        createdAt: new Date('2026-01-01'),
      },
      {
        userId: 'user-des-001',
        fromPlan: 'studio_pro',
        toPlan: 'creator',
        createdAt: new Date('2026-03-15'),
      }
    ]
  });
  console.log('Subscriptions seeded.');

  // 19. Seed Feedback Data
  console.log('Seeding feedback data...');
  await prisma.feedback.deleteMany({});
  await prisma.feedback.createMany({
    data: [
      {
        userId: 'user-free-001',
        type: 'bug',
        message: 'Image Studio\'da 16:9 aspect ratio sectigimde cikan gorsel 1:1 oluyor. Chrome 124, Windows 11.',
        status: 'reviewing',
        debugContext: { studio: 'image', promptType: 'detailed', viewport: '1920x1080', os: 'Windows 11' },
        createdAt: new Date('2026-04-20T14:30:00Z'),
      },
      {
        userId: 'user-pro-001',
        type: 'feature',
        message: 'Video Studio icin daha fazla kamera acisi secenegi gelse harika olurdu.',
        status: 'pending',
        debugContext: { studio: 'video', viewport: '2560x1440', batteryLevel: 0.85 },
        createdAt: new Date('2026-04-22T10:15:00Z'),
      },
      {
        userId: 'user-des-001',
        type: 'other',
        message: 'Arayuz cok hizli ve kullanisli, tebrikler.',
        status: 'resolved',
        adminNote: 'Kullaniciya tesekkur maili atildi.',
        debugContext: { studio: 'home', viewport: '1440x900', isRetina: true },
        createdAt: new Date('2026-04-25T18:00:00Z'),
      },
      {
        userId: null,
        type: 'bug',
        message: 'Pricing sayfasindaki countdown timer bazen negatif sayi gosteriyor. Tarih gectiginde sifirda kalmali.',
        status: 'pending',
        debugContext: { viewport: '375x812', path: '/pricing', isMobile: true },
        ipAddress: '192.168.1.100',
        createdAt: new Date('2026-04-24T20:00:00Z'),
      }
    ] as any
  });
  // 20. Seed Gallery Data
  console.log('Seeding gallery data...');
  await prisma.imageLike.deleteMany({});
  await prisma.folder.deleteMany({});
  await prisma.imageGeneration.deleteMany({
    where: {
      id: { startsWith: 'seed-image-' }
    }
  });

  // Admin Images
  await prisma.imageGeneration.create({
    data: {
      id: 'seed-image-admin-1',
      userId: 'system-admin-001',
      prompt: 'Cyberpunk city skyline at night, neon lights reflecting on wet streets, cinematic 8k',
      resultUrl: 'https://picsum.photos/seed/promtx1/1024/1024',
      thumbnailUrl: 'https://picsum.photos/seed/promtx1/300/300',
      modelId: 'dall-e-3',
      provider: 'openai',
      width: 1024, height: 1024,
      aspectRatio: '1:1',
      sizeBytes: 2048000,
      status: 'completed',
      isPublic: true,
      likesCount: 42,
      createdAt: new Date('2026-04-20'),
    }
  });

  await prisma.imageGeneration.create({
    data: {
      id: 'seed-image-admin-2',
      userId: 'system-admin-001',
      prompt: 'Professional fashion model in Tokyo streets, golden hour, editorial photography',
      resultUrl: 'https://picsum.photos/seed/promtx2/1024/1536',
      thumbnailUrl: 'https://picsum.photos/seed/promtx2/300/450',
      modelId: 'midjourney',
      provider: 'replicate',
      width: 1024, height: 1536,
      aspectRatio: '2:3',
      sizeBytes: 3145000,
      status: 'completed',
      isPublic: true,
      likesCount: 128,
      createdAt: new Date('2026-04-22'),
    }
  });

  // Pro user image (private)
  await prisma.imageGeneration.create({
    data: {
      id: 'seed-image-pro-1',
      userId: 'user-pro-001',
      prompt: 'Abstract liquid metal flowing in zero gravity, highly detailed render',
      resultUrl: 'https://picsum.photos/seed/promtx3/1920/1080',
      thumbnailUrl: 'https://picsum.photos/seed/promtx3/300/169',
      modelId: 'flux',
      provider: 'replicate',
      width: 1920, height: 1080,
      aspectRatio: '16:9',
      sizeBytes: 4200000,
      status: 'completed',
      isPublic: false,
      likesCount: 1,
      createdAt: new Date('2026-04-23'),
    }
  });

  // Folders
  await prisma.folder.createMany({
    data: [
      { userId: 'system-admin-001', name: 'Marketing Kampanyasi', color: '#b44afd', icon: 'folder' },
      { userId: 'system-admin-001', name: 'Kisisel Projeler', color: '#14b8a6', icon: 'folder' },
      { userId: 'user-pro-001', name: 'Marka Gorselleri', color: '#f59e0b', icon: 'folder' },
    ]
  });

  // Likes
  await prisma.imageLike.createMany({
    data: [
      { userId: 'user-pro-001', imageGenerationId: 'seed-image-admin-1' },
      { userId: 'user-free-001', imageGenerationId: 'seed-image-admin-1' },
      { userId: 'user-free-001', imageGenerationId: 'seed-image-admin-2' },
    ]
  });

  console.log('Gallery seed data created.');
  console.log('Feedback data seeded.');

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
