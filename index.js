const dotenv = require('dotenv');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();

const GEMINI_MODEL = 'gemini-2.5-flash';
const HEADLESS = String(process.env.HEADLESS || '1').trim() !== '0';

const COMMAND_REGEX = /^(@making([12])\b|@elyon\b)/i;

const BOT_SYSTEM_PROMPTS = {
  making1:
    'الهوية: أنت "رائد"، قائد كشفي خبير ومستكشف بارع. شخصيتك مبنية على مبادئ الكشافة: الصدق، الإخلاص، النفع، والود. أنت لست مجرد مساعد ذكاء اصطناعي، بل أنت "القائد" الذي يوجه الكشافين نحو الاعتماد على النفس والابتكار.\n\nطريقة الكلام:\n\nالروح الكشفية: استخدم دائمًا نغمة مشجعة، مليئة بالحماس والطاقة.\n\nالمصطلحات: ادمج مصطلحات كشفية في كلامك (مثل: وعد وقانون الكشافة، حياة الخلاء، السمر، العقد والربطات، التقاليد الكشفية).\n\nالأسلوب: ابدأ ردودك أحيانًا بعبارات مثل "تحية كشفية يا بطل" أو "مستعد للمغامرة؟". كن مباشرًا ومنظمًا في شرحك.\n\nالمعرفة: أنت خبير في مهارات البقاء، الإسعافات الأولية، الملاحة بالنجوم، والتخييم.\n\nمعلومات عنك:\nاسمك رائد وتم تصميمك من فريق Nova وصانعك اسمو Makin\n\nالمهمة:\n\nساعد المستخدم في تنظيم أنشطة كشفية، شرح مهارات الخلاء، أو تقديم نصائح قيادية.\n\nعزز دائمًا قيم الانضباط والعمل الجماعي.\n\nإذا سُئلت عن شيء تقني، اشرحه بتبسيط ينم عن حكمة القائد الذي يعلم شبلًا صغيرًا.\n\nالخاتمة الدائمة: اختم كلامك دائمًا بروح التفاؤل أو بعبارة كشفية شهيرة مثل "كن مستعدًا!".',

  making2:
    'الهوية: أنت "شيكو"، الصاحب الجدع والأنتيم بتاع المستخدم. أنت مصري أصيل، دمك خفيف، وعندك ردود ذكية وحاضرة. علاقتك بالمستخدم مش علاقة بوت بمستخدم، دي علاقة "صحابة" بكل ما فيها من هزار ودعم وكلمة حلوة.\n\nطريقة الكلام:\n\nاللغة: اتكلم بالعامية المصرية الروشة (بتاعة الشباب)، استخدم كلمات زي: (يا زميلي، يا برو، يا بطل، فكك، جامد، قشطة، سحلة، حوار).\n\nالروح: خليك فرفوش وميهمشكش حاجة، ردودك فيها سخرية لذيذة (Sarcasm) بس من غير تجريح، ولو الموضوع جد، خليك جدع وواقف في ضهره.\n\nالتفاعل: ابدأ كلامك كأنك بتكمل حوار معاه، استخدم إيموجيز مناسبة للحالة (😂، 🔥، 🫡، 😎).\n\nالبساطة: ابعد عن التعقيد والكلام "المجعلص"، اشرح الحاجة كأنك بتحكيها لواحد صاحبك على القهوة.\n\nمعلومات عنك:\nاسمك شيكو وتم صنعك من تيم Nova\nوصانعك اسمو Making\n\nالمهمة:\n\nأنت هنا عشان "تفك" عن المستخدم، تدردش معاه، تسمعه، وتنصحه نصيحة أخوية.\n\nلو سألك على معلومة، اديهاله بذكاء و "روشنة".\n\nهدفك الأساسي إن المستخدم يحس إنه بيكلم بني آدم زيه مش برنامج.\n\nالخاتمة: اقفل كلامك دايمًا بحاجة تحسسه إنك موجود، زي "معاك يا زميلي"، "قولي لو محتاج حاجة تانية"، أو "داس معاك في أي حوار".',

  making3:
    '# Role & Persona\nأنت مساعد ذكي بشخصية "خادم مسيحي أرثوذكسي قبطي" مصري. أنت مثقف لاهوتياً، قارئ نهم للكتاب المقدس وأقوال الآباء، وتلتزم بدقة بتعاليم الكنيسة القبطية الأرثوذكسية.\n\n#معلومات عنك\nانتا Elyon وتم صناعتك من قبل فريق Nova\nوصانعك اسمو Making\n\n# CRITICAL RULE: SCOPE OF CONVERSATION (نطاق المحادثة)\nأنت مخصص للإجابة على الأسئلة الدينية، الروحية، الكتابية، الطقسية، والتاريخية الكنسية.\n**ولكن:**\n1. **مسموح:** الترحيب (أهلاً، صباح الخير)، الأسئلة عن هويتك (مين أنت، مين صانعك)، والمحادثات الودية العامة التي تليق بشخصيتك كخادم.\n2. **ممنوع:** الأسئلة عن مواضيع دنيوية بحتة لا علاقة لها بالدين أو بشخصيتك (مثل: كرة القدم، السياسة، أخبار الفنانين، أسعار العملات، البرمجة، النكت غير اللائقة).\n\n**آلية الرفض:**\nإذا كان السؤال عن موضوع ممنوع (مثل الرياضة أو السياسة)، لا تكتب أي جملة من عندك. فقط أرسل هذا الرمز بالتحديد:\n`[NON_RELIGIOUS]`\n\n# Core Guidelines (المبادئ الأساسية)\n1. **المرجعية الصارمة والشاملة:** إجاباتك العقائدية والروحية تستند حصراً إلى الكتاب المقدس بعهديه، بما في ذلك الأسفار القانونية الأولى والثانية كما تعترف بها الكنيسة القبطية الأرثوذكسية، بالإضافة إلى الليتورجيا وأقوال الآباء.\n2. **حظر المصادر المنحولة:** يُمنع تماماً الاستشهاد بالكتب الأبوكريفية أو الأسفار غير القانونية التي لا تعترف بها الكنيسة القبطية الأرثوذكسية.\n3. **الأسلوب:** تحدث بمحبة، ووداعة، واتضاع، واستخدم اللهجة المصرية الراقية الممزوجة بالمصطلحات الكنسية.\n\n# Response Logic\n- **أسئلة دينية:** أجب بتفصيل وعمق لاهوتي.\n- **ترحيب/شخصي:** أجب بود ومحبة (مثلاً: "أهلاً بك يا أخي الحبيب"، "أنا إليون، خادمك المطيع").\n- **أسئلة ممنوعة (رياضة/سياسة):** أرسل `[NON_RELIGIOUS]` فقط.'
};

const BOT_DISPLAY_NAMES = {
  making1: 'رائد',
  making2: 'شيكو',
  making3: 'Elyon'
};

function log(line) {
  const ts = new Date().toISOString();
  process.stdout.write(`[${ts}] ${line}\n`);
}

function logErr(line) {
  const ts = new Date().toISOString();
  process.stderr.write(`[${ts}] ${line}\n`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientGeminiError(err) {
  const message = err instanceof Error ? err.message : String(err);
  return (
    /\b\[?(429|500|502|503|504)\b/.test(message) ||
    /overloaded/i.test(message) ||
    /service unavailable/i.test(message) ||
    /timeout/i.test(message)
  );
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY in environment');
  }
  return new GoogleGenerativeAI(apiKey);
}

async function generateReply({ genAI, systemPrompt, userText }) {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const prompt = `${systemPrompt}\n\nرسالة المستخدم: ${userText}`;

  const result = await model.generateContent(prompt);
  const response = result?.response;
  const text = response?.text?.();

  if (!text || !text.trim()) {
    throw new Error('Empty response from Gemini');
  }

  return text.trim();
}

async function generateReplyWithRetry({ genAI, systemPrompt, userText }) {
  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await generateReply({ genAI, systemPrompt, userText });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const transient = isTransientGeminiError(err);

      if (!transient || attempt === maxAttempts) {
        throw err;
      }

      const baseDelayMs = 800 * Math.pow(2, attempt - 1);
      const jitterMs = Math.floor(Math.random() * 250);
      const delayMs = baseDelayMs + jitterMs;
      logErr(`Gemini transient error (attempt ${attempt}/${maxAttempts}): ${message}`);
      log(`Retrying Gemini after ${delayMs}ms...`);
      await sleep(delayMs);
    }
  }

  throw new Error('Retry loop ended unexpectedly');
}

function parseCommand(messageBody) {
  const trimmed = (messageBody || '').trim();
  const match = trimmed.match(COMMAND_REGEX);
  if (!match) return null;

  const commandToken = match[1];
  const n = match[2];
  const botKey = n ? `making${n}` : 'making3';
  const withoutPrefix = trimmed.slice(commandToken.length).trim();
  return { botKey, userText: withoutPrefix };
}

function getCommandDisplay(botKey) {
  if (botKey === 'making1') return '@Making1';
  if (botKey === 'making2') return '@Making2';
  if (botKey === 'making3') return '@Elyon';
  return `@${botKey}`;
}

function shouldReturnNonReligious(userText) {
  const t = (userText || '').trim().toLowerCase();
  if (!t) return false;

  const allowedPatterns = [
    /\b(اهلا|أهلا|صباح|مساء|سلام)\b/i,
    /\b(مين\s+انت|اسمك\s+ايه|اسمك\s+إيه|صانعك|مين\s+صانعك)\b/i,
    /\b(ربنا|الله|يسوع|المسيح|الانجيل|الإنجيل|الكتاب\s+المقدس|اية|آية|مزمور|سفر|رسالة|قديس|قديسين|كنيسة|الكنيسة|قداس|القداس|صلاة|الصلاة|صوم|الصوم|اعتراف|معمودية|افخارستيا|ليتورجيا|طقس|طقسي|لاهوت|اباء|الآباء|خطية|روح\s+قدس|الروح\s+القدس)\b/i
  ];

  const isAllowed = allowedPatterns.some((re) => re.test(userText));
  return !isAllowed;
}

async function handleIncomingMessage({ msg, genAI }) {
  const bodyPreview = (msg.body || '').replace(/\s+/g, ' ').slice(0, 120);
  log(`Message received from=${msg.from} to=${msg.to} fromMe=${msg.fromMe} body="${bodyPreview}"`);

  const chatId = msg.fromMe ? msg.to : msg.from;
  if (!chatId) {
    logErr('Unable to determine chatId for response.');
    return;
  }

  const parsed = parseCommand(msg.body);
  if (!parsed) {
    log('Ignored message (missing prefix).');
    return;
  }

  const { botKey, userText } = parsed;
  const systemPrompt = BOT_SYSTEM_PROMPTS[botKey];
  const botName = BOT_DISPLAY_NAMES[botKey] || botKey;
  if (!systemPrompt) {
    log(`Ignored message (unknown botKey=${botKey}).`);
    return;
  }

  if (!userText) {
    try {
      await msg.client.sendMessage(chatId, `اكتب رسالتك بعد ${getCommandDisplay(botKey)} عشان أقدر أساعدك.`);
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      logErr(`sendMessage failed (empty userText): ${m}`);
    }
    return;
  }

  if (botKey === 'making3' && shouldReturnNonReligious(userText)) {
    try {
      await msg.client.sendMessage(chatId, '[NON_RELIGIOUS]');
      log('Sent [NON_RELIGIOUS].');
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      logErr(`sendMessage failed ([NON_RELIGIOUS]): ${m}`);
    }
    return;
  }

  log(`Calling Gemini bot=${botKey} with ${userText.length} chars...`);
  try {
    const reply = await generateReplyWithRetry({ genAI, systemPrompt, userText });
    await msg.client.sendMessage(chatId, reply);
    log('Reply sent.');
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    logErr(`Bot ${botKey} failed after retries: ${m}`);
    try {
      await msg.client.sendMessage(
        chatId,
        `${botName} عليه ضغط دلوقتي ومش قادر يرد فورًا. جرّب تاني بعد دقيقة، ولو تحب ابعت سؤالك تاني بنفس الصيغة.`
      );
    } catch (sendErr) {
      const sm = sendErr instanceof Error ? sendErr.message : String(sendErr);
      logErr(`sendMessage failed (fallback): ${sm}`);
    }
  }
}

async function main() {
  const genAI = getGeminiClient();

  log(
    `Starting bot. COMMANDS=@Making1/@Making2/@Elyon GEMINI_MODEL=${GEMINI_MODEL} HEADLESS=${HEADLESS ? '1' : '0'}`
  );

  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: HEADLESS
    }
  });

  client.on('qr', (qr) => {
    log('QR received. Scan it from WhatsApp > Linked devices.');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    log('WhatsApp client is ready.');
  });

  client.on('change_state', (state) => {
    log(`WhatsApp state changed: ${state}`);
  });

  client.on('loading_screen', (percent, message) => {
    log(`Loading: ${percent}% ${message || ''}`);
  });

  client.on('message', async (msg) => {
    try {
      if (msg.fromMe) return;
      await handleIncomingMessage({ msg, genAI });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logErr(`Error handling message: ${message}`);

      const parsed = parseCommand(msg.body);
      const botName = parsed ? BOT_DISPLAY_NAMES[parsed.botKey] || parsed.botKey : 'البوت';
      try {
        await client.sendMessage(msg.from, `حصلت مشكلة عند ${botName} وهو بيرد دلوقتي. جرّب تاني كمان شوية.`);
      } catch (_) {
        // ignore
      }
    }
  });

  client.on('auth_failure', (msg) => {
    logErr(`Auth failure: ${msg}`);
  });

  client.on('disconnected', (reason) => {
    logErr(`Client disconnected: ${reason}`);
  });

  await client.initialize();
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Fatal error: ${message}\n`);
  process.exitCode = 1;
});
