// Wycena online (/wycena): jeden formularz w dwóch trybach – meble na wymiar albo usługi B2B – z wskazówkami
// właścicielki obok (desktop) albo nad polami (telefon) i potwierdzeniem wysłania w miejscu formularza.
// Tryb siedzi w adresie (?typ=b2b), więc linki z innych stron otwierają właściwy formularz; mogą też zaznaczyć
// usługę (?usluga=Cięcie) albo rodzaj mebli (?mebel=Kuchnia) i dopisać do opisu inspirację (?inspiracja=) lub dekor (?dekor=).
// Walidacja na żywo tymi samymi regułami co na serwerze (shared/inquiry.js); wysyłka multipart z paskiem postępu.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigationType, useSearchParams } from 'react-router-dom';
import PageShell from './PageShell.jsx';
import { ArrowIcon, Reveal } from '../home/ui.jsx';
import { B2B_SERVICES, COMPANY, FURNITURE_TYPES, ROUTES } from '../../../shared/site.js';
import {
  EQUIPMENT,
  FILE_LIMITS,
  INQUIRY_TYPES,
  LABELS,
  MATERIAL_SOURCES,
  MAX_LENGTH,
  MIN_FILL_MS,
  PROJECT_OPTIONS,
  conditionalActive,
  fileProblem,
  formatBytes,
  normalizeInquiry,
  plural,
  validateInquiry,
} from '../../../shared/inquiry.js';
import {
  B2B_NOTE,
  Choices,
  FileDrop,
  FINAL_NOTE,
  FORM_INTRO,
  GuideAside,
  GuideCompact,
  Icon,
  LEAD,
  MATERIALS_NOTE,
  MODES,
  PROJECT_TIPS,
  TextField,
  emailFor,
} from './QuoteParts.jsx';
import './quote.css';

const WIDE = '(min-width: 1024px)'; // ten sam próg co dwie kolumny w quote.css
// przewijanie do pola / potwierdzenia: płynne, chyba że ktoś ograniczył animacje w systemie
const scrollBehavior = () => (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

const EMPTY = {
  name: '',
  email: '',
  phone: '',
  city: '',
  message: '',
  furniture: [],
  project: '',
  dimensions: '',
  materials: '',
  equipment: [],
  equipmentOther: '',
  transport: false,
  assembly: false,
  deadline: '',
  company: '',
  nip: '',
  services: [],
  materialSource: '',
  materialType: '',
  elements: '',
  processing: '',
  edging: '',
  drilling: '',
  bending: '',
  pickup: '',
};

// Pola wysyłane w danym trybie (wartości po normalizeInquiry – puste pomijamy, pola drugiego trybu też).
const SENT_FIELDS = {
  meble: ['name', 'email', 'phone', 'city', 'message', 'furniture', 'project', 'dimensions', 'materials', 'equipment', 'equipmentOther', 'transport', 'assembly', 'deadline'],
  b2b: ['name', 'email', 'phone', 'company', 'nip', 'message', 'services', 'materialSource', 'materialType', 'elements', 'processing', 'edging', 'drilling', 'bending', 'pickup'],
};

const FILE_FORMS = ['plik', 'pliki', 'plików'];
const LEGAL_NAME = COMPANY.legalName.replace(/ ([a-zA-Z]) /g, ' $1\u00a0'); // „sp. z o.o.” bez „z” na końcu wiersza
const ADDRESS = `${COMPANY.invoiceAddress.street}, ${COMPANY.invoiceAddress.postal} ${COMPANY.invoiceAddress.city}`;

// --- wypełnianie z adresu --------------------------------------------------------------------------
// porównanie bez wielkości liter i polskich znaków: ?usluga=ciecie → „Cięcie”, ?mebel=kuchnia → „Kuchnia”
const fold = (s) => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ł/g, 'l').trim();
const pickAll = (values, list) => [...new Set(values.map((v) => list.find((item) => fold(item) === fold(v))).filter(Boolean))];
// tekst z adresu trafia do opisu: bez znaków sterujących, jedna linia, rozsądna długość
const prefillText = (v) => String(v ?? '').replace(/[\p{Cc}\p{Cf}]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);

function readPrefill(params) {
  const lines = [];
  const inspiration = prefillText(params.get('inspiracja'));
  const decor = prefillText(params.get('dekor'));
  if (inspiration) lines.push(`Inspiracja ze strony: ${inspiration}`);
  if (decor) lines.push(`Kolor / dekor: ${decor}`);
  return {
    services: pickAll(params.getAll('usluga').flatMap((v) => v.split(',')), B2B_SERVICES),
    furniture: pickAll(params.getAll('mebel'), FURNITURE_TYPES),
    lines,
  };
}

function modeFromParams(params) {
  const typ = fold(params.get('typ'));
  if (typ === 'b2b' || typ === 'meble') return typ;
  return readPrefill(params).services.length ? 'b2b' : 'meble';
}

// Dopisuje (bez powtórzeń) to, co niesie adres – nic, co wpisał klient, nie znika.
function applyPrefill(values, { services, furniture, lines }) {
  const next = { ...values };
  if (services.length) next.services = [...new Set([...values.services, ...services])];
  if (furniture.length) next.furniture = [...new Set([...values.furniture, ...furniture])];
  const missing = lines.filter((line) => !values.message.includes(line));
  if (missing.length) next.message = `${[values.message.trimEnd(), ...missing].filter(Boolean).join('\n')}\n`;
  return next;
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.(query).matches));
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);
  return matches;
}

// XMLHttpRequest zamiast fetch: fetch nie raportuje postępu wysyłania, a załączniki mogą mieć razem 25 MB.
function postInquiry(body, onProgress, xhrRef) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open('POST', '/api/inquiries');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText || '{}');
      } catch {
        /* odpowiedź spoza API (np. strona błędu serwera pośredniczącego) */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(Object.assign(new Error(data.error || `Serwer odpowiedział błędem (${xhr.status}).`), { fields: data.fields }));
    };
    xhr.onerror = () => reject(Object.assign(new Error('network'), { network: true }));
    xhr.onabort = () => reject(Object.assign(new Error('abort'), { aborted: true }));
    xhr.send(body);
  });
}

// Krok formularza: numer + tytuł (h3) i pola. Zwykły blok z nagłówkiem – bez landmarków dla każdego kroku.
function Step({ n, title, children }) {
  const id = `s-quote-step-${n}`;
  return (
    <Reveal className="s-quote-step" aria-labelledby={id} role="group" y={20}>
      <h3 className="s-quote-step__title" id={id}>
        <span className="s-quote-step__num" aria-hidden="true">
          {String(n).padStart(2, '0')}
        </span>
        {title}
      </h3>
      {children}
    </Reveal>
  );
}

function Success({ result, headingRef, onAgain }) {
  const { files, size } = result;
  return (
    <div className="s-quote-success">
      <span className="s-quote-success__icon" aria-hidden="true">
        <Icon name="check" size={30} />
      </span>
      <h2 ref={headingRef} id="s-quote-success-title" className="s-quote-success__title" tabIndex={-1}>
        Dziękujemy! Zapytanie zostało wysłane
      </h2>
      <dl className="s-quote-summary">
        <div className="s-quote-summary__row">
          <dt>Rodzaj zapytania</dt>
          <dd>
            {INQUIRY_TYPES[result.type]}
            {result.scope ? `: ${result.scope}` : ''}
          </dd>
        </div>
        <div className="s-quote-summary__row">
          <dt>Odpowiemy na adres</dt>
          <dd>{result.email}</dd>
        </div>
        <div className="s-quote-summary__row">
          <dt>Załączniki</dt>
          <dd>{files ? `${files} ${plural(files, FILE_FORMS)} (${formatBytes(size)})` : 'bez załączników'}</dd>
        </div>
      </dl>
      <p className="s-quote-success__note">{FINAL_NOTE}</p>
      {result.type === 'b2b' && <p className="s-quote-success__note">{B2B_NOTE}</p>}
      <div className="s-quote-success__actions">
        <button type="button" className="h-btn" onClick={onAgain}>
          Wyślij kolejne zapytanie
        </button>
        <Link className="h-btn h-btn--outline" to={ROUTES.home}>
          Strona główna
        </Link>
      </div>
    </div>
  );
}

export default function QuotePage() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navType = useNavigationType();
  const mode = modeFromParams(params);
  const b2b = mode === 'b2b';
  const wide = useMediaQuery(WIDE);

  const [values, setValues] = useState(() => applyPrefill(EMPTY, readPrefill(params)));
  const [files, setFiles] = useState([]); // [{ id, file }]
  const [fileIssues, setFileIssues] = useState([]);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sendError, setSendError] = useState('');
  const [result, setResult] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const [focusInvalid, setFocusInvalid] = useState(0);

  const formRef = useRef(null);
  const cardRef = useRef(null);
  const titleRef = useRef(null);
  const successRef = useRef(null);
  const fileInputRef = useRef(null);
  const removeRefs = useRef({});
  const honeypotRef = useRef(null);
  const xhrRef = useRef(null);
  const startedAt = useRef(0);
  const selfNav = useRef(false); // zmiana adresu przez przełącznik trybu (replace) – bez ponownego wypełniania
  const firstKey = useRef(location.key);
  const lastUrl = useRef(location.pathname + location.search); // adres bez kotwicy przy poprzednim wejściu
  const pendingFocus = useRef(null); // 'success' | 'form' – dokąd przenieść fokus po zmianie widoku
  const nextFileFocus = useRef(null); // po usunięciu pliku: kolejny przycisk „Usuń” albo pole wyboru plików

  // czas wypełniania liczony od pokazania formularza (serwer odrzuca zgłoszenia szybsze niż 3 s)
  useEffect(() => {
    startedAt.current = Date.now();
    return () => xhrRef.current?.abort();
  }, []);

  // Wejście z innego linku przy otwartej stronie (np. „Zapytanie B2B” w stopce): tryb zmienia sam adres,
  // a usługi, rodzaje mebli i linie opisu dopisujemy do tego, co już jest. Po wysłaniu – znowu formularz.
  // Kliknięty link (nie „Wstecz”/„Dalej”) przewija do formularza i daje fokus jego nagłówkowi – inaczej zmiana
  // zachodzi poza ekranem, a przy linku pod tym samym adresem przewinięcia nie zmienia nawet router.
  // Sama kotwica pod tym samym adresem (np. „Przejdź do treści” = #tresc: przeglądarka zgłasza ją jak „Wstecz”,
  // z nowym kluczem wpisu) nie jest nowym wejściem – potwierdzenie wysłania i poprawki w formularzu zostają.
  useEffect(() => {
    const url = location.pathname + location.search;
    const sameUrl = url === lastUrl.current;
    lastUrl.current = url;
    if (location.key === firstKey.current || (sameUrl && (navType === 'POP' || location.hash))) return;
    if (selfNav.current) {
      selfNav.current = false;
      return;
    }
    setValues((v) => applyPrefill(v, readPrefill(params)));
    const reveal = navType !== 'POP';
    if (result) {
      startedAt.current = Date.now();
      if (reveal) pendingFocus.current = 'form'; // przewinięcie i fokus po zamianie potwierdzenia na formularz
      setResult(null);
    } else if (reveal) {
      cardRef.current?.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
      titleRef.current?.focus({ preventScroll: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reagujemy tylko na nowe wejście w historii
  }, [location.key]);

  // Plik upuszczony obok strefy przeglądarka by otworzyła (formularz by przepadł) – poza strefą blokujemy upuszczanie.
  useEffect(() => {
    const guard = (e) => {
      if (!Array.from(e.dataTransfer?.types || []).includes('Files')) return;
      if (e.target instanceof Element && e.target.closest('.s-quote-drop')) return;
      e.preventDefault();
      if (e.type === 'dragover') e.dataTransfer.dropEffect = 'none';
    };
    window.addEventListener('dragover', guard);
    window.addEventListener('drop', guard);
    return () => {
      window.removeEventListener('dragover', guard);
      window.removeEventListener('drop', guard);
    };
  }, []);

  // po nieudanej próbie wysłania – fokus na pierwszym błędnym polu (wyśrodkowanym pod pływającą nawigacją)
  useEffect(() => {
    if (!focusInvalid) return;
    const el = formRef.current?.querySelector('[aria-invalid="true"]');
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
  }, [focusInvalid]);

  // potwierdzenie ↔ formularz: fokus na nagłówku nowego widoku (czytnik ekranu go odczyta)
  useEffect(() => {
    const target = pendingFocus.current;
    pendingFocus.current = null;
    if (!target) return;
    cardRef.current?.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
    (target === 'success' ? successRef : titleRef).current?.focus({ preventScroll: true });
  }, [result]);

  useEffect(() => {
    const target = nextFileFocus.current;
    if (!target) return;
    nextFileFocus.current = null;
    (target === 'input' ? fileInputRef.current : removeRefs.current[target])?.focus();
  }, [files]);

  // --- walidacja --------------------------------------------------------------------------------------
  const data = useMemo(() => normalizeInquiry({ ...values, type: mode }), [values, mode]);
  const errors = useMemo(() => validateInquiry(data), [data]);
  const filled = (v) => (Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim() !== '' : Boolean(v));
  // Błąd widać po pierwszej próbie wysłania; wcześniej tylko w polu opuszczonym z błędną treścią (np. e-mail
  // bez „@”) – puste pole nie krzyczy, dopóki ktoś po prostu przechodzi Tabem dalej.
  const errorOf = (name) => serverErrors[name] || (submitted || (touched[name] && filled(values[name])) ? errors[name] : undefined);

  const clearServerError = (name) => setServerErrors((s) => (s[name] ? { ...s, [name]: undefined } : s));
  const bind = (name) => ({
    value: values[name],
    maxLength: MAX_LENGTH[name],
    error: errorOf(name),
    onChange: (e) => {
      const { value } = e.target;
      setValues((v) => ({ ...v, [name]: value }));
      clearServerError(name);
    },
    onBlur: () => setTouched((t) => (t[name] ? t : { ...t, [name]: true })),
  });
  const toggleIn = (name) => (item) => {
    setValues((v) => ({ ...v, [name]: v[name].includes(item) ? v[name].filter((x) => x !== item) : [...v[name], item] }));
    clearServerError(name);
  };
  const setOne = (name) => (value) => {
    setValues((v) => ({ ...v, [name]: value }));
    clearServerError(name);
  };

  // Tryb w adresie bez nowego wpisu w historii (Wstecz nie przełącza trybów). Wpisane dane obu trybów zostają.
  const setMode = (next) => {
    if (next === mode) return;
    selfNav.current = true;
    setSubmitted(false); // pola nowego trybu nie świecą błędami, zanim ktoś spróbuje wysłać
    setServerErrors({});
    setSendError('');
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (next === 'b2b') p.set('typ', 'b2b');
        else {
          p.delete('typ');
          p.delete('usluga'); // usługa w adresie oznacza tryb B2B
        }
        return p;
      },
      { replace: true },
    );
  };

  // --- załączniki -------------------------------------------------------------------------------------
  const addFiles = (list) => {
    const incoming = Array.from(list || []);
    if (!incoming.length) return;
    const issues = [];
    const next = [...files];
    let total = next.reduce((sum, f) => sum + f.file.size, 0);
    for (const file of incoming) {
      const label = `„${file.name}”`;
      if (next.some((f) => f.file.name === file.name && f.file.size === file.size && f.file.lastModified === file.lastModified)) {
        issues.push(`Plik ${label} jest już na liście.`);
        continue;
      }
      const problem = fileProblem(file.name, file.size);
      if (problem) {
        issues.push(problem);
        continue;
      }
      if (next.length >= FILE_LIMITS.count) {
        issues.push(`Pominięto plik ${label}\u00a0– możesz dodać najwyżej ${FILE_LIMITS.count} ${plural(FILE_LIMITS.count, FILE_FORMS)}.`);
        continue;
      }
      if (total + file.size > FILE_LIMITS.total) {
        issues.push(`Pominięto plik ${label}\u00a0– łączny rozmiar załączników może wynosić najwyżej ${formatBytes(FILE_LIMITS.total)}.`);
        continue;
      }
      next.push({ id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, file });
      total += file.size;
    }
    const added = next.length - files.length;
    setFiles(next);
    setFileIssues(issues);
    clearServerError('files');
    if (added) setAnnouncement(`Dodano ${added} ${plural(added, FILE_FORMS)}. Załączników razem: ${next.length}.`);
  };

  const removeFile = (id) => {
    const index = files.findIndex((f) => f.id === id);
    if (index === -1) return;
    const rest = files.filter((f) => f.id !== id);
    nextFileFocus.current = rest[index]?.id || rest[index - 1]?.id || 'input';
    setFiles(rest);
    setFileIssues([]);
    clearServerError('files');
    setAnnouncement(`Usunięto plik ${files[index].file.name}.`);
  };

  // --- wysyłka ------------------------------------------------------------------------------------------
  const onSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;
    setSubmitted(true);
    setSendError('');
    if (Object.keys(errors).length) {
      setFocusInvalid((n) => n + 1);
      return;
    }

    setSending(true);
    setProgress(0);
    setAnnouncement('Wysyłanie zapytania…');
    const body = new FormData();
    body.append('typ', mode);
    for (const key of SENT_FIELDS[mode]) {
      const value = data[key];
      if (Array.isArray(value)) value.forEach((item) => body.append(key, item));
      else if (value === true) body.append(key, 'tak');
      else if (value) body.append(key, value);
    }
    files.forEach(({ file }) => body.append('files', file, file.name));
    body.append('website', honeypotRef.current?.value || '');
    // Szybciej niż w 3 s wysyłają tylko boty; człowiekowi z autouzupełnianiem dokładamy brakujący ułamek sekundy.
    const wait = MIN_FILL_MS + 250 - (Date.now() - startedAt.current);
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    body.append('elapsed', String(Date.now() - startedAt.current));

    try {
      await postInquiry(body, setProgress, xhrRef);
      pendingFocus.current = 'success';
      setResult({
        type: mode,
        email: data.email,
        scope: (b2b ? data.services : data.furniture).join(', '),
        files: files.length,
        size: files.reduce((sum, f) => sum + f.file.size, 0),
      });
      setValues(EMPTY);
      setFiles([]);
      setFileIssues([]);
      setTouched({});
      setSubmitted(false);
      setServerErrors({});
      setAnnouncement('Zapytanie zostało wysłane.');
    } catch (err) {
      if (err.aborted) return;
      if (err.fields) {
        setServerErrors(err.fields);
        setFocusInvalid((n) => n + 1);
      }
      setSendError(err.network ? 'Nie udało się połączyć z\u00a0serwerem. Sprawdź połączenie z\u00a0internetem i\u00a0spróbuj ponownie.' : err.message);
      setAnnouncement('');
    } finally {
      setSending(false);
    }
  };

  const again = () => {
    pendingFocus.current = 'form';
    startedAt.current = Date.now();
    setResult(null);
    setAnnouncement('');
  };

  // --- kroki formularza -----------------------------------------------------------------------------------
  const options = (list) => list.map((value) => ({ value, label: value }));
  const fileDrop = (hint) => (
    <FileDrop
      hint={hint}
      files={files}
      issues={fileIssues}
      error={serverErrors.files}
      onAdd={addFiles}
      onRemove={removeFile}
      inputRef={fileInputRef}
      removeRefs={removeRefs}
    />
  );

  const furnitureSteps = (
    <>
      <Step n={1} title="Projekt">
        <Choices
          name="furniture"
          legend={LABELS.furniture}
          hint="Możesz zaznaczyć kilka."
          options={options(FURNITURE_TYPES)}
          isChecked={(t) => values.furniture.includes(t)}
          onToggle={toggleIn('furniture')}
          error={errorOf('furniture')}
        />
        <Choices
          name="project"
          type="radio"
          legend={LABELS.project}
          options={Object.entries(PROJECT_OPTIONS).map(([value, label]) => ({ value, label }))}
          isChecked={(v) => values.project === v}
          onToggle={setOne('project')}
          error={errorOf('project')}
        >
          <div aria-live="polite">
            {values.project && (
              <p className="s-quote-tipline">
                <Icon name={values.project === 'gotowy' ? 'plan' : 'sketch'} size={20} />
                <span>{PROJECT_TIPS[values.project]}</span>
              </p>
            )}
          </div>
        </Choices>
        <TextField
          name="message"
          label={LABELS.message}
          hint={'Opisz meble i\u00a0ich przeznaczenie oraz oczekiwany układ szafek, półek i\u00a0szuflad.'}
          required
          multiline
          rows={6}
          {...bind('message')}
        />
      </Step>

      <Step n={2} title={'Wymiary i\u00a0wykończenie'}>
        <TextField
          name="dimensions"
          label={LABELS.dimensions}
          hint={'Najlepiej w\u00a0milimetrach: szerokość, wysokość i\u00a0głębokość planowanej zabudowy.'}
          placeholder="np. 3600 × 2600 × 600 mm"
          multiline
          short
          rows={2}
          {...bind('dimensions')}
        />
        <TextField name="materials" label={LABELS.materials} hint={MATERIALS_NOTE} multiline short rows={2} {...bind('materials')} />
        <Choices
          name="equipment"
          legend={LABELS.equipment}
          options={options(EQUIPMENT)}
          isChecked={(t) => values.equipment.includes(t)}
          onToggle={toggleIn('equipment')}
          error={errorOf('equipment')}
        />
        <TextField name="equipmentOther" label={LABELS.equipmentOther} {...bind('equipmentOther')} />
      </Step>

      <Step n={3} title="Załączniki">
        {fileDrop('Rzuty, widoki, odręczny szkic z\u00a0wymiarami, zdjęcia pomieszczenia lub inspiracje.')}
      </Step>

      <Step n={4} title="Realizacja">
        <TextField name="city" label={LABELS.city} required autoComplete="address-level2" {...bind('city')} />
        <Choices
          name="delivery"
          legend={'Transport i\u00a0montaż'}
          options={[
            { value: 'transport', label: 'Potrzebuję transportu' },
            { value: 'assembly', label: 'Potrzebuję montażu' },
          ]}
          isChecked={(key) => values[key]}
          onToggle={(key) => setValues((v) => ({ ...v, [key]: !v[key] }))}
        />
        <TextField name="deadline" label={LABELS.deadline} placeholder="np. do końca marca" {...bind('deadline')} />
      </Step>
    </>
  );

  const b2bSteps = (
    <>
      <Step n={1} title="Zlecenie">
        <Choices
          name="services"
          legend={LABELS.services}
          required
          hint={'Zaznacz co najmniej jedną. Przy oklejaniu, nawiercaniu, frezowaniu i\u00a0gięciu pojawią się dodatkowe pola.'}
          options={options(B2B_SERVICES)}
          isChecked={(s) => values.services.includes(s)}
          onToggle={toggleIn('services')}
          error={errorOf('services')}
        />
        <TextField
          name="message"
          label={LABELS.messageB2B}
          hint={'Krótko opisz zlecenie\u00a0– szczegóły możesz podać w\u00a0polach poniżej.'}
          required
          multiline
          rows={5}
          {...bind('message')}
        />
      </Step>

      <Step n={2} title={'Materiał i\u00a0elementy'}>
        <Choices
          name="materialSource"
          type="radio"
          legend={LABELS.materialSource}
          options={Object.entries(MATERIAL_SOURCES).map(([value, label]) => ({ value, label }))}
          isChecked={(v) => values.materialSource === v}
          onToggle={setOne('materialSource')}
          error={errorOf('materialSource')}
        />
        <TextField name="materialType" label={LABELS.materialType} placeholder="np. płyta wiórowa laminowana 18 mm" {...bind('materialType')} />
        <TextField
          name="elements"
          label={LABELS.elements}
          hint={'Możesz też dołączyć listę formatek w\u00a0załącznikach, np. plik CSV lub XLSX.'}
          multiline
          rows={5}
          {...bind('elements')}
        />
        <TextField
          name="processing"
          label={LABELS.processing}
          hint="Zakres obróbki dla każdego elementu oraz wymagania dotyczące dokładności."
          multiline
          short
          rows={3}
          {...bind('processing')}
        />
        {conditionalActive('edging', values.services) && (
          <div className="s-quote-cond">
            <TextField name="edging" label={LABELS.edging} multiline short rows={2} {...bind('edging')} />
          </div>
        )}
        {conditionalActive('drilling', values.services) && (
          <div className="s-quote-cond">
            <TextField name="drilling" label={LABELS.drilling} multiline short rows={2} {...bind('drilling')} />
          </div>
        )}
        {conditionalActive('bending', values.services) && (
          <div className="s-quote-cond">
            <TextField name="bending" label={LABELS.bending} multiline short rows={2} {...bind('bending')} />
          </div>
        )}
      </Step>

      <Step n={3} title="Załączniki">
        {fileDrop('Rysunki, lista formatek albo zdjęcia elementów.')}
      </Step>

      <Step n={4} title={'Termin i\u00a0odbiór'}>
        <TextField name="pickup" label={LABELS.pickup} hint="Jeśli zależy Ci na dostawie, podaj też miejscowość." {...bind('pickup')} />
      </Step>
    </>
  );

  const email = emailFor(mode);
  const progressPct = Math.round(progress * 100);

  return (
    <PageShell eyebrow="Wycena online" title={['Opowiedz nam', 'o\u00a0swoim projekcie']} lead={LEAD}>
      <section id="formularz" className="s-quote-section">
        <div className={`h-container s-quote-grid${result ? ' is-done' : ''}`}>
          <div ref={cardRef} className="s-quote-card">
            {result ? (
              <Success result={result} headingRef={successRef} onAgain={again} />
            ) : (
              <form ref={formRef} className="s-quote-form" noValidate onSubmit={onSubmit} aria-labelledby="s-quote-form-title">
                <Reveal className="s-quote-head" y={16}>
                  <h2 ref={titleRef} id="s-quote-form-title" className="s-quote-title" tabIndex={-1}>
                    Formularz wyceny
                  </h2>
                  <p className="s-quote-intro">{FORM_INTRO}</p>
                  <p className="s-quote-reqnote">
                    Pola oznaczone{' '}
                    <span className="s-quote-req" aria-hidden="true">
                      *
                    </span>
                    <span className="h-visually-hidden">gwiazdką</span> są wymagane, pozostałe uzupełnij, jeśli możesz.
                  </p>
                </Reveal>

                <Reveal as="fieldset" className="s-quote-modes" delay={80} y={16}>
                  <legend className="s-quote-label">Czego dotyczy zapytanie?</legend>
                  <div className="s-quote-modes__grid">
                    {MODES.map((m) => (
                      <label key={m.id} className="s-quote-mode">
                        <input
                          className="s-quote-mode__input"
                          type="radio"
                          name="typ"
                          value={m.id}
                          checked={mode === m.id}
                          onChange={() => setMode(m.id)}
                          aria-labelledby={`s-quote-mode-${m.id}`}
                          aria-describedby={`s-quote-mode-${m.id}-sub`}
                        />
                        <span className="s-quote-mode__body">
                          <span className="s-quote-mode__icon">
                            <Icon name={m.icon} />
                          </span>
                          <span className="s-quote-mode__dot" aria-hidden="true">
                            <svg width="10" height="10" viewBox="0 0 10 10" focusable="false">
                              <circle cx="5" cy="5" r="5" fill="currentColor" />
                            </svg>
                          </span>
                          <span className="s-quote-mode__title" id={`s-quote-mode-${m.id}`}>
                            {m.title}
                          </span>
                          <span className="s-quote-mode__sub" id={`s-quote-mode-${m.id}-sub`}>
                            {m.sub}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </Reveal>

                {!wide && <GuideCompact mode={mode} />}

                {b2b ? b2bSteps : furnitureSteps}

                <Step n={5} title="Dane kontaktowe">
                  <div className="s-quote-row s-quote-row--2">
                    <TextField name="name" label={b2b ? LABELS.nameB2B : LABELS.name} required autoComplete="name" {...bind('name')} />
                    {b2b && <TextField name="company" label={LABELS.company} autoComplete="organization" {...bind('company')} />}
                    {b2b && <TextField name="nip" label={LABELS.nip} placeholder="np. 123-456-78-90" autoComplete="off" {...bind('nip')} />}
                    <TextField
                      name="email"
                      label={LABELS.email}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      spellCheck={false}
                      required
                      {...bind('email')}
                    />
                    <TextField name="phone" label={LABELS.phone} type="tel" inputMode="tel" autoComplete="tel" {...bind('phone')} />
                  </div>
                </Step>

                {/* pułapka na boty: pole niewidoczne i poza kolejnością Tab – człowiek go nie wypełni */}
                <div className="s-quote-hp" aria-hidden="true">
                  <label htmlFor="s-quote-website">Strona internetowa (zostaw puste)</label>
                  <input ref={honeypotRef} id="s-quote-website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
                </div>

                <div className="s-quote-submit">
                  {sendError && (
                    <div className="s-quote-alert" role="alert">
                      <Icon name="alert" size={20} />
                      <p>
                        {sendError} Jeśli problem się powtarza, napisz na <a href={`mailto:${email}`}>{email}</a>.
                      </p>
                    </div>
                  )}
                  <div className="s-quote-submit__row">
                    <button type="submit" className="h-btn s-quote-submit__btn" aria-disabled={sending || undefined}>
                      {sending ? (files.length ? `Wysyłanie… ${progressPct}%` : 'Wysyłanie…') : 'Wyślij zapytanie'}
                      {!sending && <ArrowIcon />}
                    </button>
                    <p className="s-quote-submit__note">{FINAL_NOTE}</p>
                  </div>
                  {sending && files.length > 0 && (
                    <div
                      className="s-quote-progress"
                      role="progressbar"
                      aria-label="Wysyłanie załączników"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={progressPct}
                    >
                      <span className="s-quote-progress__bar" style={{ transform: `scaleX(${progress})` }} />
                    </div>
                  )}
                  <p className="s-quote-clause">
                    Administratorem danych osobowych jest {LEGAL_NAME}, {ADDRESS}. Dane z&nbsp;formularza przetwarzamy w&nbsp;celu
                    przygotowania wyceny i&nbsp;kontaktu w&nbsp;sprawie zapytania (art. 6 ust. 1 lit. b&nbsp;RODO). Więcej
                    w&nbsp;<Link to={ROUTES.privacy}>polityce prywatności</Link>.
                  </p>
                </div>
              </form>
            )}
          </div>
          {wide && !result && <GuideAside mode={mode} />}
        </div>
        <p className="h-visually-hidden" role="status">
          {announcement}
        </p>
      </section>
    </PageShell>
  );
}
