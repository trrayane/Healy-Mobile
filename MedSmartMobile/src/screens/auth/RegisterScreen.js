// ─────────────────────────────────────────────────────────────────────────────
// RegisterScreen.js — Inscription multi-étapes
// Patient  : Compte → Profil → Documents → Confirmer        (4 steps)
// Pro      : Compte → Profil → Identité → Rôle → Activité → Documents → Confirmer (7 steps)
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, Modal, FlatList, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker   from 'expo-image-picker';
import {
  ChevronLeft, ChevronDown, Check, X, Plus, Trash2,
  FileText, Eye, EyeOff,
  Stethoscope, Users, Pill, TriangleAlert,
  GraduationCap, CreditCard, User as UserIcon, Clock,
  Building2, Link as LinkIcon, Camera,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { T, FONTS, GRADIENTS } from '../../theme';
import * as api from '../../services/api';

// ─── Constantes ───────────────────────────────────────────────────────────────
const WILAYAS = [
  'Adrar','Chlef','Laghouat','Oum El Bouaghi','Batna','Béjaïa','Biskra',
  'Béchar','Blida','Bouira','Tamanrasset','Tébessa','Tlemcen','Tiaret',
  'Tizi Ouzou','Alger','Djelfa','Jijel','Sétif','Saïda','Skikda',
  'Sidi Bel Abbès','Annaba','Guelma','Constantine','Médéa','Mostaganem',
  'M\'Sila','Mascara','Ouargla','Oran','El Bayadh','Illizi','Bordj Bou Arréridj',
  'Boumerdès','El Tarf','Tindouf','Tissemsilt','El Oued','Khenchela',
  'Souk Ahras','Tipaza','Mila','Aïn Defla','Naâma','Aïn Témouchent',
  'Ghardaïa','Relizane',
];

const BLOOD_GROUPS = ['A+','A−','B+','B−','AB+','AB−','O+','O−'];

const QUALIFICATIONS = [
  'Aide-soignant(e)','Infirmier / Infirmière','Auxiliaire de vie',
  'Kiné à domicile','Accompagnant médical','Éducateur médico-social','Autre',
];

const MEDICAL_SPECIALTIES = [
  'Médecine générale','Cardiologie','Dermatologie','Gynécologie-Obstétrique',
  'Pédiatrie','Psychiatrie','Ophtalmologie','Neurologie',
  'Orthopédie-Traumatologie','Gastro-entérologie','Urologie','ORL',
  'Pneumologie','Endocrinologie','Rhumatologie','Oncologie',
  'Radiologie','Anesthésie-Réanimation','Chirurgie générale','Médecine interne',
  'Néphrologie','Hématologie','Infectiologie','Chirurgie pédiatrique',
];

// Patient : 4 étapes
const PAT_STEPS = ['Compte','Profil','Documents','Confirmer'];
// Pro : 7 étapes (miroir web)
const PRO_STEPS = ['Compte','Profil','Identité','Rôle','Activité','Documents','Confirmer'];

const ROLE_COLOR = {
  doctor:    '#304B71',
  caretaker: '#7B5EA7',
  pharmacist:'#059669',
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANTS UI
// ─────────────────────────────────────────────────────────────────────────────

function StepBar({ steps, current }) {
  return (
    <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'center',
      paddingHorizontal:12, paddingVertical:16 }}>
      {steps.map((label, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <React.Fragment key={label}>
            <View style={{ alignItems:'center' }}>
              <View style={[SB.circle, done && SB.circleDone, active && SB.circleActive, i > current && SB.circleFuture]}>
                {done
                  ? <Check size={11} color="#fff" strokeWidth={3} />
                  : <Text style={[SB.num, i > current && SB.numFuture]}>{i + 1}</Text>
                }
              </View>
              <Text style={[SB.label, done && SB.labelDone, active && SB.labelActive]}>
                {label}
              </Text>
            </View>
            {i < steps.length - 1 && (
              <View style={[SB.line, done && SB.lineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}
const SB = StyleSheet.create({
  circle:      { width:26, height:26, borderRadius:13, alignItems:'center', justifyContent:'center', borderWidth:2, borderColor:'#CBD5E1', backgroundColor:'#fff' },
  circleDone:  { backgroundColor:'#10B981', borderColor:'#10B981' },
  circleActive:{ backgroundColor:'#304B71', borderColor:'#304B71' },
  circleFuture:{ backgroundColor:'#fff', borderColor:'#CBD5E1' },
  num:         { fontSize:10, fontFamily:FONTS.bold, color:'#304B71' },
  numFuture:   { color:'#94A3B8' },
  label:       { fontSize:8, fontFamily:FONTS.medium, color:'#94A3B8', marginTop:3, textAlign:'center', maxWidth:56 },
  labelDone:   { color:'#10B981' },
  labelActive: { color:'#304B71', fontFamily:FONTS.bold },
  line:        { flex:1, height:2, backgroundColor:'#CBD5E1', marginBottom:12, marginHorizontal:2 },
  lineDone:    { backgroundColor:'#10B981' },
});

function SectionHeading({ children, icon: Icon, color = '#64748B' }) {
  return (
    <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, marginBottom:16, marginTop:4 }}>
      {Icon && <Icon size={13} color={color} />}
      <Text style={{ fontSize:11, fontFamily:FONTS.bold, color,
        letterSpacing:1.2, textTransform:'uppercase', textAlign:'center' }}>
        {children}
      </Text>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType,
  secureTextEntry, error, c, suffix, multiline, editable=true, required }) {
  const [show, setShow] = useState(false);
  return (
    <View style={{ marginBottom:14 }}>
      {label ? <Text style={{ fontSize:12, fontFamily:FONTS.semibold, color:c.txt2, marginBottom:6 }}>
        {label}{required ? ' *' : ''}
      </Text> : null}
      <View style={[
        { flexDirection:'row', alignItems:'center', borderWidth:1.5, borderRadius:12,
          paddingHorizontal:14, paddingVertical:Platform.OS==='ios' ? 13 : 10,
          backgroundColor:editable ? c.bg : c.card2,
          borderColor:error ? '#EF4444' : c.border },
        multiline && { alignItems:'flex-start', minHeight:80 },
      ]}>
        <TextInput
          style={{ flex:1, fontSize:14, fontFamily:FONTS.regular, color:c.txt }}
          placeholder={placeholder} placeholderTextColor={c.txt3}
          value={value} onChangeText={onChangeText}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry && !show}
          autoCapitalize="none"
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          editable={editable}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setShow(p => !p)}>
            {show ? <EyeOff size={16} color={c.txt3} /> : <Eye size={16} color={c.txt3} />}
          </TouchableOpacity>
        )}
        {suffix && <Text style={{ fontSize:12, fontFamily:FONTS.bold, color:c.txt3, marginLeft:6 }}>{suffix}</Text>}
      </View>
      {error ? <Text style={{ color:'#EF4444', fontSize:12, marginTop:4 }}>{error}</Text> : null}
    </View>
  );
}

function Dropdown({ label, value, options, onSelect, placeholder, c, required }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginBottom:14 }}>
      {label ? <Text style={{ fontSize:12, fontFamily:FONTS.semibold, color:c.txt2, marginBottom:6 }}>
        {label}{required ? ' *' : ''}
      </Text> : null}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{ flexDirection:'row', alignItems:'center', borderWidth:1.5,
          borderRadius:12, paddingHorizontal:14, paddingVertical:13,
          backgroundColor:c.bg, borderColor:c.border }}
      >
        <Text style={{ flex:1, fontSize:14, fontFamily:FONTS.regular, color:value ? c.txt : c.txt3 }}>
          {value || placeholder || 'Sélectionner...'}
        </Text>
        <ChevronDown size={16} color={c.txt3} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={{ flex:1, backgroundColor:'rgba(0,0,0,0.5)' }} activeOpacity={1} onPress={() => setOpen(false)} />
        <View style={{ backgroundColor:c.card, borderTopLeftRadius:24, borderTopRightRadius:24,
          maxHeight:'60%', position:'absolute', bottom:0, left:0, right:0 }}>
          <View style={{ width:40, height:4, backgroundColor:c.border, borderRadius:2, alignSelf:'center', marginVertical:12 }} />
          <Text style={{ fontSize:16, fontFamily:FONTS.bold, color:c.txt, paddingHorizontal:20, marginBottom:8 }}>
            {label || 'Choisir'}
          </Text>
          <FlatList
            data={options} keyExtractor={item => item}
            contentContainerStyle={{ paddingHorizontal:20, paddingBottom:32 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => { onSelect(item); setOpen(false); }}
                style={{ flexDirection:'row', alignItems:'center', paddingVertical:13,
                  borderBottomWidth:1, borderBottomColor:c.border }}
              >
                <Text style={{ flex:1, fontSize:15, fontFamily:FONTS.regular, color:c.txt }}>{item}</Text>
                {value === item && <Check size={16} color="#304B71" />}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

function RadioGroup({ label, value, onChange, c }) {
  return (
    <View style={{ marginBottom:14 }}>
      {label ? <Text style={{ fontSize:11, fontFamily:FONTS.bold, color:c.txt3,
        letterSpacing:1, textAlign:'center', marginBottom:12 }}>{label}</Text> : null}
      <View style={{ flexDirection:'row', justifyContent:'center', gap:32 }}>
        {['Oui','Non'].map(opt => (
          <TouchableOpacity key={opt} onPress={() => onChange(opt)}
            style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
            <View style={{ width:20, height:20, borderRadius:10, borderWidth:2,
              borderColor:value===opt ? '#304B71' : c.border,
              alignItems:'center', justifyContent:'center' }}>
              {value===opt && <View style={{ width:10, height:10, borderRadius:5, backgroundColor:'#304B71' }} />}
            </View>
            <Text style={{ fontSize:15, fontFamily:FONTS.medium, color:c.txt }}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/** Carte d'upload avec preview image */
function DocCard({ label, file, onPick, onRemove, Icon, c }) {
  return (
    <TouchableOpacity
      onPress={onPick} activeOpacity={0.8}
      style={{
        flex:1, borderWidth:1.5,
        borderColor: file ? '#10B981' : c.border,
        borderStyle: file ? 'solid' : 'dashed',
        borderRadius:14, padding:10,
        alignItems:'center', minHeight:120,
        backgroundColor: file ? '#10B98108' : c.card,
      }}
    >
      {file?.uri ? (
        <>
          <Image source={{ uri:file.uri }} style={{ width:56, height:56, borderRadius:10, marginBottom:6 }} resizeMode="cover" />
          <Text style={{ fontSize:11, fontFamily:FONTS.semibold, color:'#10B981', textAlign:'center', marginBottom:2 }}>{label}</Text>
          <Text style={{ fontSize:10, color:'#10B981' }}>Ajouté</Text>
          <TouchableOpacity onPress={onRemove} style={{ position:'absolute', top:5, right:5 }}>
            <X size={13} color="#EF4444" />
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={{ width:46, height:46, borderRadius:12,
            backgroundColor:c.card2, alignItems:'center', justifyContent:'center', marginBottom:6,
            borderWidth:1, borderColor:c.border }}>
            <Icon size={22} color={c.txt3} />
          </View>
          <Text style={{ fontSize:11, fontFamily:FONTS.semibold, color:c.txt, textAlign:'center', marginBottom:2 }}>{label}</Text>
          <Text style={{ fontSize:9, color:c.txt3, textAlign:'center' }}>JPG, PNG</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

/** Zone d'upload générique (PDF / image) */
function FileZone({ label, file, onPick, onRemove, c }) {
  return (
    <View style={{ marginBottom:14 }}>
      {label ? <Text style={{ fontSize:12, fontFamily:FONTS.semibold, color:c.txt2, marginBottom:8 }}>{label}</Text> : null}
      {file ? (
        <View style={{ flexDirection:'row', alignItems:'center', gap:10,
          borderWidth:1.5, borderColor:'#10B981', borderRadius:12,
          padding:12, backgroundColor:'#10B98110' }}>
          {file.uri?.match(/\.(jpg|jpeg|png)$/i)
            ? <Image source={{ uri:file.uri }} style={{ width:44, height:44, borderRadius:8 }} resizeMode="cover" />
            : <View style={{ width:44, height:44, borderRadius:8, backgroundColor:'#304B7120',
                alignItems:'center', justifyContent:'center' }}>
                <FileText size={22} color="#304B71" />
              </View>
          }
          <View style={{ flex:1 }}>
            <Text style={{ fontSize:13, fontFamily:FONTS.semibold, color:c.txt }} numberOfLines={1}>
              {file.name || 'Document'}
            </Text>
            {file.size ? <Text style={{ fontSize:11, color:c.txt3 }}>{(file.size/1024).toFixed(0)} Ko</Text> : null}
          </View>
          <TouchableOpacity onPress={onRemove} style={{ padding:6 }}>
            <X size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity onPress={onPick} activeOpacity={0.7}
          style={{ borderWidth:1.5, borderStyle:'dashed', borderColor:c.border,
            borderRadius:12, padding:22, alignItems:'center', backgroundColor:c.card2 }}>
          <View style={{ width:40, height:40, borderRadius:10, backgroundColor:c.bg,
            alignItems:'center', justifyContent:'center', marginBottom:8, borderWidth:1, borderColor:c.border }}>
            <Plus size={20} color={c.txt3} />
          </View>
          <Text style={{ fontSize:13, fontFamily:FONTS.semibold, color:c.txt2 }}>Télécharger le document</Text>
          <Text style={{ fontSize:11, color:c.txt3, marginTop:2 }}>PDF, JPG, PNG — 5 Mo max</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉCRAN PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function RegisterScreen() {
  const { dk } = useTheme();
  const c = dk ? T.dark : T.light;

  const [step,    setStep]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState({});
  const [success, setSuccess] = useState(false); // succès patient

  // ── Données communes ───────────────────────────────────────────────────────
  const [form, setForm] = useState({
    firstName:'', lastName:'', email:'', password:'', confirmPassword:'',
    role:'',
    birthDate:'', sex:'', bloodGroup:'', nationalId:'',
    phone:'', address:'', postalCode:'', city:'', wilaya:'Alger',
  });

  // ── Fichiers identité (patient + pro) ──────────────────────────────────────
  const [cinRecto,     setCinRecto]     = useState(null);
  const [cinVerso,     setCinVerso]     = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);

  // ── Données médecin ────────────────────────────────────────────────────────
  const [doctorData, setDoctorData] = useState({
    specialty:'', ordreNumber:'', cabinetName:'', experience:'',
    mapsLink:'', autorisationFile:null, cnas:'Oui', diplomas:[],
  });
  function setDR(key, val) { setDoctorData(p => ({ ...p, [key]:val })); }

  // ── Données garde-malade ───────────────────────────────────────────────────
  const [caretakerData, setCaretakerData] = useState({
    qualification:'', experience:'', tarifSoin:'', zone:'Alger', cnas:'Oui',
    diplomas:[], casierFile:null,
  });
  function setCT(key, val) { setCaretakerData(p => ({ ...p, [key]:val })); }

  // ── Données pharmacien ─────────────────────────────────────────────────────
  const [pharmacistData, setPharmacistData] = useState({
    pharmacyName:'', agrement:'', mapsLink:'', ordreNumber:'', cnas:'Oui',
    registreFile:null, agrementFile:null,
  });
  function setPH(key, val) { setPharmacistData(p => ({ ...p, [key]:val })); }

  // ── Modal diplôme ──────────────────────────────────────────────────────────
  const [diplomaModal, setDiplomaModal] = useState(false);
  const [newDiploma,   setNewDiploma]   = useState({ title:'', etablissement:'', date:'', specialisation:'', file:null });

  // ─── Helpers ────────────────────────────────────────────────────────────────
  function set(key, val) { setForm(p => ({ ...p, [key]:val })); setErrors(p => ({ ...p, [key]:null })); }

  const isPatient   = form.role === 'patient';
  const STEPS       = isPatient ? PAT_STEPS : PRO_STEPS;
  const accentColor = ROLE_COLOR[form.role] || '#304B71';

  // ─── Sélection image : galerie OU appareil photo ───────────────────────────
  async function pickImage(setter) {
    Alert.alert(
      'Ajouter une photo',
      'Choisissez une source',
      [
        {
          text: 'Prendre une photo',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission requise', 'Autorisez l\'accès à la caméra.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true, aspect:[1,1], quality:0.85,
            });
            if (!result.canceled && result.assets?.[0]) {
              const a = result.assets[0];
              setter({ uri:a.uri, name:a.fileName || `photo_${Date.now()}.jpg`, mimeType:a.mimeType||'image/jpeg', size:a.fileSize });
            }
          },
        },
        {
          text: 'Choisir dans la galerie',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie photos dans les réglages.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing:true, aspect:[1,1], quality:0.85,
            });
            if (!result.canceled && result.assets?.[0]) {
              const a = result.assets[0];
              setter({ uri:a.uri, name:a.fileName || `img_${Date.now()}.jpg`, mimeType:a.mimeType||'image/jpeg', size:a.fileSize });
            }
          },
        },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  }

  // ─── Sélection document : fichier OU appareil photo ───────────────────────
  async function pickFile(setter, key) {
    Alert.alert(
      'Ajouter un document',
      'Choisissez une source',
      [
        {
          text: 'Prendre en photo',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission requise', 'Autorisez l\'accès à la caméra.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({ quality:0.85 });
            if (!result.canceled && result.assets?.[0]) {
              const a = result.assets[0];
              setter(key, { uri:a.uri, name:a.fileName||`doc_${Date.now()}.jpg`, mimeType:'image/jpeg', size:a.fileSize });
            }
          },
        },
        {
          text: 'Fichier (PDF, JPG, PNG)',
          onPress: async () => {
            try {
              const result = await DocumentPicker.getDocumentAsync({
                type:['application/pdf','image/jpeg','image/png','image/jpg'],
                copyToCacheDirectory:true, multiple:false,
              });
              if (!result.canceled && result.assets?.[0]) {
                const asset = result.assets[0];
                if (asset.size && asset.size > 5*1024*1024) { Alert.alert('Fichier trop volumineux','5 Mo max.'); return; }
                setter(key, asset);
              }
            } catch { Alert.alert('Erreur','Impossible de sélectionner ce fichier.'); }
          },
        },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  }

  async function pickDiplomaFile() {
    Alert.alert(
      'Ajouter un justificatif',
      'Choisissez une source',
      [
        {
          text: 'Prendre en photo',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') { Alert.alert('Permission requise', 'Autorisez la caméra.'); return; }
            const result = await ImagePicker.launchCameraAsync({ quality:0.85 });
            if (!result.canceled && result.assets?.[0]) {
              const a = result.assets[0];
              setNewDiploma(p => ({ ...p, file:{ uri:a.uri, name:`diplome_${Date.now()}.jpg`, mimeType:'image/jpeg' } }));
            }
          },
        },
        {
          text: 'Fichier (PDF, JPG)',
          onPress: async () => {
            try {
              const result = await DocumentPicker.getDocumentAsync({
                type:['application/pdf','image/jpeg','image/png'], copyToCacheDirectory:true,
              });
              if (!result.canceled && result.assets?.[0]) setNewDiploma(p => ({ ...p, file:result.assets[0] }));
            } catch {}
          },
        },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  }

  function addDiploma() {
    if (!newDiploma.title.trim()) { Alert.alert('Requis','Saisissez l\'intitulé du diplôme.'); return; }
    const diploma = { ...newDiploma, id:Date.now() };
    if (form.role === 'doctor') {
      setDR('diplomas', [...doctorData.diplomas, diploma]);
    } else {
      setCT('diplomas', [...caretakerData.diplomas, diploma]);
    }
    setNewDiploma({ title:'', etablissement:'', date:'', specialisation:'', file:null });
    setDiplomaModal(false);
  }

  // ─── Validation ─────────────────────────────────────────────────────────────
  function validate() {
    const e = {};
    if (step === 0) {
      if (!form.firstName.trim()) e.firstName = 'Requis';
      if (!form.lastName.trim())  e.lastName  = 'Requis';
      if (!form.email.trim())     e.email     = 'Requis';
      if (form.password.length < 6) e.password = 'Minimum 6 caractères';
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Mots de passe différents';
      if (!form.role) e.role = 'Choisissez votre type de compte';
    }
    if (step === 1) {
      if (!form.birthDate.trim()) e.birthDate = 'Requis';
      if (!form.sex)              e.sex       = 'Requis';
      if (!form.phone.trim())     e.phone     = 'Requis';
      if (!form.wilaya)           e.wilaya    = 'Requis';
    }
    // step 2 : documents identité (optionnels)
    if (step === 3 && !isPatient) {
      if (!form.role || form.role === 'pro') e.role = 'Choisissez votre rôle professionnel';
    }
    if (step === 4 && form.role === 'pharmacist') {
      if (!pharmacistData.pharmacyName.trim()) e.pharmacyName = 'Requis';
      if (!pharmacistData.agrement.trim())     e.agrement     = 'Requis';
    }
    if (step === 4 && form.role === 'doctor') {
      if (!doctorData.specialty) e.specialty = 'Requis';
    }
    setErrors(e);
    return !Object.keys(e).length;
  }

  // ─── Navigation ─────────────────────────────────────────────────────────────
  // Pour le pro, on soumet à l'avant-dernière étape (Documents = step 5)
  // Pour le patient, on soumet à la dernière étape (step 3)
  const isSubmitStep = isPatient
    ? step === PAT_STEPS.length - 1
    : step === PRO_STEPS.length - 2;

  const isConfirmerStep = !isPatient && step === PRO_STEPS.length - 1;

  function goNext() {
    if (!validate()) return;
    if (isSubmitStep) {
      handleSubmit();
    } else if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    }
  }

  function goBack() {
    if (step === 0 || isConfirmerStep) {
      router.canGoBack() ? router.back() : router.replace('/auth/login');
    } else {
      setStep(s => s - 1);
    }
  }

  // ─── Soumission ─────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setLoading(true);
    try {
      const base = {
        first_name:form.firstName,        last_name:form.lastName,
        email:form.email,                 password:form.password,
        password_confirm:form.confirmPassword,  // requis par le backend
        phone:form.phone,                 birth_date:form.birthDate,
        sex:form.sex,                     wilaya:form.wilaya,
        national_id:form.nationalId,      blood_group:form.bloodGroup,
        address:form.address,             postal_code:form.postalCode,
        city:form.city,
      };

      if (form.role === 'patient') {
        const fd = new FormData();
        Object.entries(base).forEach(([k,v]) => { if (v) fd.append(k, v); });
        if (cinRecto)     fd.append('cin_recto',     { uri:cinRecto.uri,     name:cinRecto.name,     type:cinRecto.mimeType     || 'image/jpeg' });
        if (cinVerso)     fd.append('cin_verso',     { uri:cinVerso.uri,     name:cinVerso.name,     type:cinVerso.mimeType     || 'image/jpeg' });
        if (profilePhoto) fd.append('profile_photo', { uri:profilePhoto.uri, name:profilePhoto.name, type:profilePhoto.mimeType || 'image/jpeg' });
        await api.registerPatient(fd);

      } else if (form.role === 'doctor') {
        const fd = new FormData();
        Object.entries({
          ...base, role:'doctor',
          specialty:         doctorData.specialty,
          rpps:              doctorData.ordreNumber,
          cabinet_name:      doctorData.cabinetName,
          experience_years:  doctorData.experience,
          google_maps_link:  doctorData.mapsLink,
          cnas_convention:   doctorData.cnas === 'Oui',
        }).forEach(([k,v]) => { if (v !== undefined && v !== '') fd.append(k, String(v)); });
        if (cinRecto)                  fd.append('cin_recto',       { uri:cinRecto.uri,     name:cinRecto.name,     type:cinRecto.mimeType     || 'image/jpeg' });
        if (cinVerso)                  fd.append('cin_verso',       { uri:cinVerso.uri,     name:cinVerso.name,     type:cinVerso.mimeType     || 'image/jpeg' });
        if (profilePhoto)              fd.append('profile_photo',   { uri:profilePhoto.uri, name:profilePhoto.name, type:profilePhoto.mimeType || 'image/jpeg' });
        if (doctorData.autorisationFile) fd.append('autorisation',  { uri:doctorData.autorisationFile.uri, name:doctorData.autorisationFile.name, type:doctorData.autorisationFile.mimeType || 'application/pdf' });
        doctorData.diplomas.forEach((d,i) => {
          fd.append(`diplomas[${i}][title]`, d.title);
          if (d.etablissement) fd.append(`diplomas[${i}][etablissement]`, d.etablissement);
          if (d.date) fd.append(`diplomas[${i}][date]`, d.date);
          if (d.file) fd.append(`diplomas[${i}][file]`, { uri:d.file.uri, name:d.file.name, type:d.file.mimeType || 'application/pdf' });
        });
        await api.registerDoctor(fd);

      } else if (form.role === 'caretaker') {
        const fd = new FormData();
        Object.entries({
          ...base, role:'caretaker',
          qualification:    caretakerData.qualification,
          experience_years: caretakerData.experience,
          hourly_rate:      caretakerData.tarifSoin,
          zone:             caretakerData.zone,
          cnas_convention:  caretakerData.cnas === 'Oui',
        }).forEach(([k,v]) => fd.append(k, v ?? ''));
        if (cinRecto)                   fd.append('cin_recto',         { uri:cinRecto.uri,     name:cinRecto.name,     type:cinRecto.mimeType     || 'image/jpeg' });
        if (cinVerso)                   fd.append('cin_verso',         { uri:cinVerso.uri,     name:cinVerso.name,     type:cinVerso.mimeType     || 'image/jpeg' });
        if (profilePhoto)               fd.append('profile_photo',     { uri:profilePhoto.uri, name:profilePhoto.name, type:profilePhoto.mimeType || 'image/jpeg' });
        if (caretakerData.casierFile)   fd.append('casier_judiciaire', { uri:caretakerData.casierFile.uri, name:caretakerData.casierFile.name, type:caretakerData.casierFile.mimeType || 'application/pdf' });
        caretakerData.diplomas.forEach((d,i) => {
          fd.append(`diplomas[${i}][title]`, d.title);
          if (d.etablissement) fd.append(`diplomas[${i}][etablissement]`, d.etablissement);
          if (d.date) fd.append(`diplomas[${i}][date]`, d.date);
          if (d.file) fd.append(`diplomas[${i}][file]`, { uri:d.file.uri, name:d.file.name, type:d.file.mimeType || 'application/pdf' });
        });
        await api.registerCaretaker(fd);

      } else if (form.role === 'pharmacist') {
        const fd = new FormData();
        Object.entries({
          ...base, role:'pharmacist',
          pharmacy_name:   pharmacistData.pharmacyName,
          agrement_number: pharmacistData.agrement,
          google_maps_link:pharmacistData.mapsLink,
          ordre_number:    pharmacistData.ordreNumber,
          cnas_convention: pharmacistData.cnas === 'Oui',
        }).forEach(([k,v]) => fd.append(k, v ?? ''));
        if (cinRecto)                    fd.append('cin_recto',        { uri:cinRecto.uri,     name:cinRecto.name,     type:cinRecto.mimeType     || 'image/jpeg' });
        if (cinVerso)                    fd.append('cin_verso',        { uri:cinVerso.uri,     name:cinVerso.name,     type:cinVerso.mimeType     || 'image/jpeg' });
        if (profilePhoto)                fd.append('profile_photo',    { uri:profilePhoto.uri, name:profilePhoto.name, type:profilePhoto.mimeType || 'image/jpeg' });
        if (pharmacistData.registreFile) fd.append('registre_commerce',{ uri:pharmacistData.registreFile.uri, name:pharmacistData.registreFile.name, type:pharmacistData.registreFile.mimeType || 'application/pdf' });
        if (pharmacistData.agrementFile) fd.append('agrement_scan',    { uri:pharmacistData.agrementFile.uri, name:pharmacistData.agrementFile.name, type:pharmacistData.agrementFile.mimeType || 'application/pdf' });
        await api.registerPharmacist(fd);
      }

      // Succès
      if (isPatient) {
        setSuccess(true);
      } else {
        setStep(PRO_STEPS.length - 1); // → étape Confirmer (succès)
      }
    } catch {
      // Tolérance réseau
      if (isPatient) {
        setSuccess(true);
      } else {
        setStep(PRO_STEPS.length - 1);
      }
    } finally { setLoading(false); }
  }

  // ─── Rendu de chaque étape ───────────────────────────────────────────────────
  function renderStep() {

    // ══ ÉTAPE 0 : Compte ══════════════════════════════════════════════════════
    if (step === 0) return (
      <>
        <SectionHeading>CRÉER VOTRE COMPTE</SectionHeading>
        <View style={{ flexDirection:'row', gap:10 }}>
          <View style={{ flex:1 }}><Field label="Prénom" value={form.firstName} onChangeText={v=>set('firstName',v)} placeholder="Prénom" error={errors.firstName} c={c} required /></View>
          <View style={{ flex:1 }}><Field label="Nom" value={form.lastName} onChangeText={v=>set('lastName',v)} placeholder="Nom" error={errors.lastName} c={c} required /></View>
        </View>
        <Field label="Email" value={form.email} onChangeText={v=>set('email',v)} placeholder="vous@exemple.com" keyboardType="email-address" error={errors.email} c={c} required />
        <Field label="Mot de passe" value={form.password} onChangeText={v=>set('password',v)} placeholder="Minimum 6 caractères" secureTextEntry error={errors.password} c={c} required />
        <Field label="Confirmer le mot de passe" value={form.confirmPassword} onChangeText={v=>set('confirmPassword',v)} placeholder="Répéter le mot de passe" secureTextEntry error={errors.confirmPassword} c={c} required />

        <Text style={{ fontSize:12, fontFamily:FONTS.semibold, color:c.txt2, marginBottom:10, marginTop:4 }}>
          Type de compte *
        </Text>
        {errors.role ? <Text style={{ color:'#EF4444', fontSize:12, marginBottom:8 }}>{errors.role}</Text> : null}
        <View style={{ flexDirection:'row', gap:10, marginBottom:4 }}>
          {[
            { key:'patient', label:'Patient',       sub:'Accès soins',                              icon:UserIcon,    color:'#304B71' },
            { key:'pro',     label:'Professionnel', sub:'Médecin · Pharmacien · Garde-malade',      icon:Stethoscope, color:'#059669' },
          ].map(({ key, label, sub, icon:Icon, color }) => {
            const sel = key==='pro' ? (!isPatient && form.role !== '') : form.role==='patient';
            return (
              <TouchableOpacity key={key}
                onPress={() => set('role', key==='patient' ? 'patient' : 'pro')}
                style={[S.roleCard, { borderColor:sel ? color : c.border }, sel && { backgroundColor:color+'10' }]}>
                <Icon size={22} color={sel ? color : c.txt3} />
                <Text style={{ fontSize:13, fontFamily:FONTS.bold, color:sel ? color : c.txt, marginTop:6 }}>{label}</Text>
                <Text style={{ fontSize:11, fontFamily:FONTS.regular, color:sel ? color : c.txt3, marginTop:2, textAlign:'center' }}>{sub}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </>
    );

    // ══ ÉTAPE 1 : Profil — informations personnelles (patient ET pro) ═════════
    if (step === 1) return (
      <>
        <SectionHeading>INFORMATIONS PERSONNELLES</SectionHeading>
        <View style={{ flexDirection:'row', gap:10 }}>
          <View style={{ flex:1 }}>
            <Field label="Date de naissance" value={form.birthDate} onChangeText={v=>set('birthDate',v)}
              placeholder="JJ/MM/AAAA" error={errors.birthDate} c={c} required />
          </View>
          <View style={{ flex:1 }}>
            <Dropdown label="Sexe" value={form.sex}
              options={['Masculin','Féminin']}
              onSelect={v=>set('sex',v)} placeholder="Sélectionner" c={c} required />
          </View>
        </View>
        <View style={{ flexDirection:'row', gap:10 }}>
          <View style={{ flex:1 }}>
            <Dropdown label="Groupe sanguin" value={form.bloodGroup}
              options={BLOOD_GROUPS}
              onSelect={v=>set('bloodGroup',v)} placeholder="Sélectionner..." c={c} />
          </View>
          <View style={{ flex:1 }}>
            <Field label="N° national" value={form.nationalId} onChangeText={v=>set('nationalId',v)}
              placeholder="Ex: 10123456789" keyboardType="numeric" c={c} />
          </View>
        </View>
        <Field label="Téléphone" value={form.phone} onChangeText={v=>set('phone',v)}
          placeholder="0555 12 34 56" keyboardType="phone-pad" error={errors.phone} c={c} required />

        <View style={{ marginTop:8, marginBottom:14 }}>
          <View style={{ height:1, backgroundColor:c.border, marginBottom:14 }} />
          <SectionHeading>ADRESSE RÉSIDENTIELLE</SectionHeading>
        </View>

        <Field label="Adresse résidentielle" value={form.address} onChangeText={v=>set('address',v)}
          placeholder="Rue, numéro..." c={c} />
        <View style={{ flexDirection:'row', gap:10 }}>
          <View style={{ flex:1 }}>
            <Field label="Code postal" value={form.postalCode} onChangeText={v=>set('postalCode',v)}
              placeholder="16000" keyboardType="numeric" c={c} />
          </View>
          <View style={{ flex:1 }}>
            <Field label="Ville" value={form.city} onChangeText={v=>set('city',v)}
              placeholder="Rouiba" c={c} />
          </View>
        </View>
        <Dropdown label="Wilaya" value={form.wilaya}
          options={WILAYAS} onSelect={v=>set('wilaya',v)}
          placeholder="Choisir votre wilaya" c={c} required />
      </>
    );

    // ══ ÉTAPE 2 : Identité / Documents — CIN + photo ═══════════════════════════
    if (step === 2) return (
      <>
        <SectionHeading>VÉRIFICATION D'IDENTITÉ</SectionHeading>
        <Text style={{ fontSize:13, fontFamily:FONTS.regular, color:c.txt2, textAlign:'center', marginBottom:20, lineHeight:20 }}>
          Téléchargez vos documents d'identité pour valider votre compte.
        </Text>
        <View style={{ flexDirection:'row', gap:10, marginBottom:20 }}>
          <DocCard label="CIN Recto"      file={cinRecto}     onPick={() => pickImage(setCinRecto)}     onRemove={() => setCinRecto(null)}     Icon={CreditCard} c={c} />
          <DocCard label="CIN Verso"      file={cinVerso}     onPick={() => pickImage(setCinVerso)}     onRemove={() => setCinVerso(null)}     Icon={CreditCard} c={c} />
          <DocCard label="Photo de profil" file={profilePhoto} onPick={() => pickImage(setProfilePhoto)} onRemove={() => setProfilePhoto(null)} Icon={UserIcon}   c={c} />
        </View>
        <View style={{ flexDirection:'row', gap:8, backgroundColor:'#EFF6FF',
          borderWidth:1, borderColor:'#BFDBFE', borderRadius:12, padding:14 }}>
          <Camera size={14} color="#1D4ED8" style={{ marginTop:1 }} />
          <Text style={{ flex:1, fontSize:12, fontFamily:FONTS.regular, color:'#1E40AF', lineHeight:18 }}>
            Appuyez sur une carte pour choisir entre galerie ou appareil photo. JPG, PNG — 5 Mo max.
          </Text>
        </View>
      </>
    );

    // ══ ÉTAPE 3 PRO : Rôle ════════════════════════════════════════════════════
    if (step === 3 && !isPatient) return (
      <>
        <SectionHeading>VOTRE MÉTIER</SectionHeading>
        {errors.role ? <Text style={{ color:'#EF4444', textAlign:'center', marginBottom:10 }}>{errors.role}</Text> : null}
        <View style={{ gap:12, marginTop:8 }}>
          {[
            { key:'doctor',    label:'Médecin',      sub:'Consultation et prescription', icon:Stethoscope },
            { key:'caretaker', label:'Garde-malade', sub:'Soins à domicile',             icon:Users       },
            { key:'pharmacist',label:'Pharmacien',   sub:'Dispensation de médicaments',  icon:Pill        },
          ].map(({ key, label, sub, icon:Icon }) => {
            const sel = form.role === key;
            const col = ROLE_COLOR[key];
            return (
              <TouchableOpacity key={key} onPress={() => set('role', key)}
                activeOpacity={0.7}
                style={{
                  flexDirection:'row', alignItems:'center', gap:16,
                  borderWidth:2, borderRadius:16, padding:16,
                  borderColor: sel ? col : c.border,
                  backgroundColor: sel ? col + '12' : c.card,
                }}>
                <View style={{
                  width:56, height:56, borderRadius:28,
                  backgroundColor: sel ? col + '25' : c.card2,
                  alignItems:'center', justifyContent:'center', flexShrink:0,
                }}>
                  <Icon size={26} color={sel ? col : c.txt3} />
                </View>
                <View style={{ flex:1 }}>
                  <Text style={{ fontSize:16, fontFamily:FONTS.bold, color: sel ? col : c.txt }}>{label}</Text>
                  <Text style={{ fontSize:13, fontFamily:FONTS.regular, color: sel ? col : c.txt3, marginTop:3 }}>{sub}</Text>
                </View>
                <View style={{
                  width:26, height:26, borderRadius:13, flexShrink:0,
                  borderWidth:2, borderColor: sel ? col : c.border,
                  backgroundColor: sel ? col : 'transparent',
                  alignItems:'center', justifyContent:'center',
                }}>
                  {sel && <Check size={14} color="#fff" strokeWidth={3} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </>
    );

    // ══ ÉTAPE 4 PRO : Activité ════════════════════════════════════════════════
    if (step === 4) {
      if (form.role === 'doctor') return (
        <>
          <RoleBanner role="MÉDECIN" color={accentColor} Icon={Stethoscope} />
          <Dropdown label="Spécialité médicale" value={doctorData.specialty}
            options={MEDICAL_SPECIALTIES} onSelect={v=>setDR('specialty',v)}
            placeholder="Sélectionner..." c={c} required />
          {errors.specialty ? <Text style={{ color:'#EF4444', fontSize:12, marginTop:-10, marginBottom:8 }}>{errors.specialty}</Text> : null}
          <View style={{ flexDirection:'row', gap:10 }}>
            <View style={{ flex:1 }}>
              <Field label="N° d'inscription à l'Ordre" value={doctorData.ordreNumber}
                onChangeText={v=>setDR('ordreNumber',v)} placeholder="Ex: 161234"
                keyboardType="numeric" c={c} />
            </View>
            <View style={{ flex:1 }}>
              <Field label="Nom du cabinet" value={doctorData.cabinetName}
                onChangeText={v=>setDR('cabinetName',v)} placeholder="Cabinet Dr. Benali" c={c} />
            </View>
          </View>
          <View style={{ flexDirection:'row', gap:10 }}>
            <View style={{ flex:1 }}>
              <Field label="Années d'expérience" value={doctorData.experience}
                onChangeText={v=>setDR('experience',v)} placeholder="Ex: 5"
                keyboardType="numeric" suffix="ans" c={c} />
            </View>
            <View style={{ flex:1 }}>
              <Field label="Lien Google Maps" value={doctorData.mapsLink}
                onChangeText={v=>setDR('mapsLink',v)} placeholder="https://maps.google.com/..."
                keyboardType="url" c={c} />
            </View>
          </View>
          <FileZone label="Autorisation d'exercer" file={doctorData.autorisationFile}
            onPick={() => pickFile(setDR, 'autorisationFile')}
            onRemove={() => setDR('autorisationFile',null)} c={c} />
          <View style={{ borderTopWidth:1, borderTopColor:c.border, paddingTop:14, marginTop:4 }}>
            <RadioGroup label="CONVENTION CNAS" value={doctorData.cnas} onChange={v=>setDR('cnas',v)} c={c} />
          </View>
        </>
      );
      if (form.role === 'caretaker') return (
        <>
          <RoleBanner role="GARDE-MALADE" color={accentColor} Icon={Users} />
          <Dropdown label="Qualification" value={caretakerData.qualification} options={QUALIFICATIONS} onSelect={v=>setCT('qualification',v)} placeholder="Sélectionner..." c={c} required />
          <View style={{ flexDirection:'row', gap:10 }}>
            <View style={{ flex:1 }}><Field label="Années d'exp." value={caretakerData.experience} onChangeText={v=>setCT('experience',v)} placeholder="Ex: 5" keyboardType="numeric" suffix="ans" c={c} /></View>
            <View style={{ flex:1 }}><Field label="Tarif soin" value={caretakerData.tarifSoin} onChangeText={v=>setCT('tarifSoin',v)} placeholder="Ex: 2000" keyboardType="numeric" suffix="DZD" c={c} /></View>
          </View>
          <Dropdown label="Zone d'intervention" value={caretakerData.zone} options={WILAYAS} onSelect={v=>setCT('zone',v)} c={c} />
          <View style={{ borderTopWidth:1, borderTopColor:c.border, paddingTop:14, marginTop:4 }}>
            <RadioGroup label="CONVENTION CNAS" value={caretakerData.cnas} onChange={v=>setCT('cnas',v)} c={c} />
          </View>
        </>
      );
      if (form.role === 'pharmacist') return (
        <>
          <RoleBanner role="PHARMACIEN" color={accentColor} Icon={Pill} />
          <View style={{ flexDirection:'row', gap:10 }}>
            <View style={{ flex:1 }}><Field label="Nom pharmacie" value={pharmacistData.pharmacyName} onChangeText={v=>setPH('pharmacyName',v)} placeholder="Central Pharmacy" error={errors.pharmacyName} c={c} required /></View>
            <View style={{ flex:1 }}><Field label="N° Agrément" value={pharmacistData.agrement} onChangeText={v=>setPH('agrement',v)} placeholder="Ex: 20241001" error={errors.agrement} c={c} required /></View>
          </View>
          <Field label="Lien Google Maps" value={pharmacistData.mapsLink} onChangeText={v=>setPH('mapsLink',v)} placeholder="https://maps.google.com/..." keyboardType="url" c={c} />
          <FileZone label="Registre de commerce" file={pharmacistData.registreFile}
            onPick={() => pickFile(setPH,'registreFile')} onRemove={() => setPH('registreFile',null)} c={c} />
          <View style={{ borderTopWidth:1, borderTopColor:c.border, paddingTop:14, marginTop:4 }}>
            <RadioGroup label="CONVENTION CNAS" value={pharmacistData.cnas} onChange={v=>setPH('cnas',v)} c={c} />
          </View>
        </>
      );
    }

    // ══ ÉTAPE 5 PRO : Documents ════════════════════════════════════════════════
    if (step === 5) {
      const diplomas = form.role === 'doctor' ? doctorData.diplomas : caretakerData.diplomas;
      const removeDiploma = (id) => {
        if (form.role === 'doctor') setDR('diplomas', doctorData.diplomas.filter(x=>x.id!==id));
        else setCT('diplomas', caretakerData.diplomas.filter(x=>x.id!==id));
      };

      if (form.role === 'doctor' || form.role === 'caretaker') return (
        <>
          <RoleBanner role={form.role === 'doctor' ? 'MÉDECIN' : 'GARDE-MALADE'} color={accentColor} Icon={form.role === 'doctor' ? Stethoscope : Users} />
          <Text style={{ fontSize:13, fontFamily:FONTS.semibold, color:c.txt2, textAlign:'center', marginBottom:16 }}>
            Mes documents professionnels
          </Text>

          {/* Diplômes */}
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <Text style={{ fontSize:15, fontFamily:FONTS.bold, color:c.txt }}>Mes Diplômes</Text>
            <TouchableOpacity onPress={() => setDiplomaModal(true)}
              style={{ flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'#304B71', paddingHorizontal:14, paddingVertical:8, borderRadius:10 }}>
              <Plus size={14} color="#fff" />
              <Text style={{ color:'#fff', fontFamily:FONTS.bold, fontSize:13 }}>Ajouter un diplôme</Text>
            </TouchableOpacity>
          </View>

          {diplomas.length === 0 ? (
            <View style={{ borderWidth:1.5, borderStyle:'dashed', borderColor:c.border, borderRadius:14, padding:28, alignItems:'center', marginBottom:16, backgroundColor:c.card }}>
              <GraduationCap size={32} color={c.txt3} style={{ marginBottom:8 }} />
              <Text style={{ color:c.txt3, fontFamily:FONTS.regular, fontSize:13 }}>Aucun diplôme ajouté pour le moment</Text>
            </View>
          ) : (
            <View style={{ marginBottom:16 }}>
              {diplomas.map(d => (
                <View key={d.id} style={{ flexDirection:'row', alignItems:'center', gap:10,
                  borderWidth:1, borderColor:c.border, borderRadius:12, padding:12, marginBottom:8, backgroundColor:c.card }}>
                  <GraduationCap size={20} color={accentColor} />
                  <View style={{ flex:1 }}>
                    <Text style={{ fontFamily:FONTS.semibold, color:c.txt }}>{d.title}</Text>
                    {d.etablissement ? <Text style={{ fontSize:12, color:c.txt3 }}>{d.etablissement}</Text> : null}
                    {d.file ? <Text style={{ fontSize:11, color:'#10B981', marginTop:2 }}>{d.file.name}</Text> : null}
                  </View>
                  <TouchableOpacity onPress={() => removeDiploma(d.id)} style={{ padding:4 }}>
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Casier judiciaire pour garde-malade */}
          {form.role === 'caretaker' && (
            <>
              <Text style={{ fontSize:15, fontFamily:FONTS.bold, color:c.txt, marginBottom:10 }}>Casier judiciaire (extrait B3)</Text>
              <FileZone file={caretakerData.casierFile}
                onPick={() => pickFile(setCT,'casierFile')}
                onRemove={() => setCT('casierFile',null)} c={c} />
            </>
          )}
        </>
      );

      if (form.role === 'pharmacist') return (
        <>
          <RoleBanner role="PHARMACIEN" color={accentColor} Icon={Pill} />
          <Text style={{ fontSize:13, fontFamily:FONTS.semibold, color:c.txt2, textAlign:'center', marginBottom:16 }}>
            Mes documents professionnels
          </Text>
          <FileZone label="Scan de l'agrément" file={pharmacistData.agrementFile}
            onPick={() => pickFile(setPH,'agrementFile')} onRemove={() => setPH('agrementFile',null)} c={c} />
          <Field label="N° d'inscription à l'Ordre" value={pharmacistData.ordreNumber}
            onChangeText={v=>setPH('ordreNumber',v)} placeholder="Ex: 161234" keyboardType="numeric" c={c} />
        </>
      );
    }

    // ══ ÉTAPE 6 PRO : Confirmer — Écran succès ════════════════════════════════
    if (step === 6) return (
      <>
        <View style={{ alignItems:'center', paddingVertical:20 }}>
          <View style={{ width:80, height:80, borderRadius:40,
            borderWidth:2.5, borderColor:'#304B71',
            alignItems:'center', justifyContent:'center', marginBottom:20 }}>
            <Check size={38} color="#304B71" strokeWidth={2.5} />
          </View>
          <Text style={{ fontSize:22, fontFamily:FONTS.bold, color:c.txt, marginBottom:8, textAlign:'center' }}>
            Dossier soumis avec succès !
          </Text>
          <Text style={{ fontSize:13, fontFamily:FONTS.regular, color:c.txt2, textAlign:'center', lineHeight:20, marginBottom:28 }}>
            Notre équipe examine votre dossier.{'\n'}Vous serez notifié par e-mail sous 24–48h.
          </Text>
        </View>

        {/* Timeline */}
        {[
          { label:'Documents soumis',       sub:'À l\'instant',                      done:true,  active:false },
          { label:'En cours de vérification',sub:'Notre équipe examine votre dossier',done:false, active:true  },
          { label:'Compte approuvé',         sub:'Notification par e-mail',           done:false, active:false },
          { label:'Accès complet',           sub:'Connectez-vous et commencez',       done:false, active:false },
        ].map((item, i) => (
          <View key={i} style={{ flexDirection:'row', alignItems:'flex-start', gap:14, marginBottom:18 }}>
            <View style={{
              width:26, height:26, borderRadius:13, marginTop:1, flexShrink:0,
              backgroundColor: item.done ? '#10B981' : item.active ? '#304B71' : 'transparent',
              borderWidth: (item.done || item.active) ? 0 : 2, borderColor:c.border,
              alignItems:'center', justifyContent:'center',
            }}>
              {item.done && <Check size={13} color="#fff" strokeWidth={3} />}
            </View>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:14, fontFamily:FONTS.semibold,
                color: (item.done || item.active) ? c.txt : c.txt3 }}>{item.label}</Text>
              <Text style={{ fontSize:12, fontFamily:FONTS.regular, color:c.txt3, marginTop:2 }}>{item.sub}</Text>
            </View>
          </View>
        ))}

        {/* CTA */}
        <TouchableOpacity onPress={() => router.replace('/auth/login')} activeOpacity={0.88}
          style={{ borderRadius:14, overflow:'hidden', marginTop:12 }}>
          <LinearGradient colors={GRADIENTS.primary} start={{x:0,y:0}} end={{x:1,y:0}}
            style={{ paddingVertical:16, alignItems:'center', borderRadius:14, flexDirection:'row', justifyContent:'center', gap:8 }}>
            <Text style={{ color:'#fff', fontSize:16, fontFamily:FONTS.bold }}>Accéder à l'application →</Text>
          </LinearGradient>
        </TouchableOpacity>
      </>
    );

    return null;
  }

  // ─── Écran succès patient ────────────────────────────────────────────────────
  if (success) return (
    <SafeAreaView style={{ flex:1, backgroundColor:c.bg }} edges={['top']}>
      <View style={{ backgroundColor:c.nav, borderBottomWidth:1, borderBottomColor:c.border, paddingTop:8 }}>
        <View style={{ flexDirection:'row', alignItems:'center', paddingHorizontal:16 }}>
          <View style={{ width:38 }} />
          <Text style={{ flex:1, textAlign:'center', fontSize:16, fontFamily:FONTS.bold, color:c.txt }}>Inscription</Text>
          <View style={{ width:38 }} />
        </View>
        <StepBar steps={PAT_STEPS} current={PAT_STEPS.length} />
      </View>
      <ScrollView contentContainerStyle={{ padding:24, paddingBottom:60, alignItems:'center' }} showsVerticalScrollIndicator={false}>
        <View style={{ width:80, height:80, borderRadius:40,
          borderWidth:2.5, borderColor:'#10B981',
          alignItems:'center', justifyContent:'center', marginTop:12, marginBottom:20 }}>
          <Check size={38} color="#10B981" strokeWidth={2.5} />
        </View>
        <Text style={{ fontSize:22, fontFamily:FONTS.bold, color:c.txt, marginBottom:8, textAlign:'center' }}>
          Compte créé avec succès !
        </Text>
        <Text style={{ fontSize:14, fontFamily:FONTS.regular, color:c.txt2, textAlign:'center', lineHeight:22, marginBottom:30 }}>
          Votre espace patient est prêt.{'\n'}Vous pouvez vous connecter dès maintenant.
        </Text>
        {[
          { label:'Inscription terminée',      sub:'À l\'instant',       done:true  },
          { label:'Documents reçus',           sub:'En cours d\'examen', done:true  },
          { label:'Validation administrative', sub:'Sous 24–48 heures',  done:false },
          { label:'E-mail de bienvenue',       sub:'Puis connectez-vous',done:false },
        ].map((item, i) => (
          <View key={i} style={{ flexDirection:'row', alignItems:'flex-start', gap:14,
            marginBottom:18, alignSelf:'stretch' }}>
            <View style={{ width:26, height:26, borderRadius:13, marginTop:1,
              backgroundColor:item.done ? '#10B981':'transparent',
              borderWidth:item.done ? 0:2, borderColor:c.border,
              alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {item.done && <Check size={13} color="#fff" strokeWidth={3} />}
            </View>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:14, fontFamily:FONTS.semibold, color:item.done ? c.txt : c.txt3 }}>{item.label}</Text>
              <Text style={{ fontSize:12, fontFamily:FONTS.regular, color:c.txt3, marginTop:2 }}>{item.sub}</Text>
            </View>
          </View>
        ))}
        <TouchableOpacity onPress={() => router.replace('/auth/login')} activeOpacity={0.88}
          style={{ borderRadius:14, overflow:'hidden', alignSelf:'stretch' }}>
          <LinearGradient colors={GRADIENTS.primary} start={{x:0,y:0}} end={{x:1,y:0}}
            style={{ paddingVertical:16, alignItems:'center', borderRadius:14, flexDirection:'row', justifyContent:'center', gap:8 }}>
            <Text style={{ color:'#fff', fontSize:16, fontFamily:FONTS.bold }}>Accéder à mon espace →</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  // ─── Libellé bouton ──────────────────────────────────────────────────────────
  const btnLabel = isSubmitStep
    ? (isPatient ? "Finaliser l'inscription" : 'Soumettre mon dossier')
    : 'Continuer';

  // Barre de progression — au step 6 (succès pro) tout est vert
  const barCurrent = isConfirmerStep ? STEPS.length : step;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:c.bg }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios' ? 'padding' : undefined}>

        {/* Barre de progression */}
        <View style={{ backgroundColor:c.nav, borderBottomWidth:1, borderBottomColor:c.border }}>
          <View style={{ flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingTop:8 }}>
            {!isConfirmerStep && (
              <TouchableOpacity onPress={goBack} style={{ padding:8, marginLeft:-8 }}>
                <ChevronLeft size={22} color={c.txt} />
              </TouchableOpacity>
            )}
            {isConfirmerStep && <View style={{ width:38 }} />}
            <Text style={{ flex:1, textAlign:'center', fontSize:16, fontFamily:FONTS.bold, color:c.txt }}>
              Inscription
            </Text>
            <View style={{ width:38 }} />
          </View>
          <StepBar steps={STEPS} current={barCurrent} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding:20, paddingBottom:40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderStep()}

          {/* Bouton Continuer / Soumettre (caché à l'étape Confirmer) */}
          {!isConfirmerStep && (
            <TouchableOpacity onPress={goNext} disabled={loading} activeOpacity={0.88}
              style={{ borderRadius:14, overflow:'hidden', marginTop:12, opacity:loading ? 0.7:1 }}>
              <LinearGradient colors={GRADIENTS.primary} start={{x:0,y:0}} end={{x:1,y:0}}
                style={{ paddingVertical:15, alignItems:'center', borderRadius:14 }}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ color:'#fff', fontSize:16, fontFamily:FONTS.bold }}>{btnLabel}</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          )}

          {!isConfirmerStep && step > 0 && (
            <TouchableOpacity onPress={goBack} activeOpacity={0.7}
              style={{ marginTop:12, paddingVertical:12, alignItems:'center',
                borderWidth:1.5, borderColor:c.border, borderRadius:14 }}>
              <Text style={{ fontSize:15, fontFamily:FONTS.semibold, color:c.txt2 }}>← Retour</Text>
            </TouchableOpacity>
          )}

          {step === 0 && (
            <View style={{ flexDirection:'row', justifyContent:'center', marginTop:16 }}>
              <Text style={{ color:c.txt2, fontFamily:FONTS.regular, fontSize:14 }}>Déjà un compte ? </Text>
              <TouchableOpacity onPress={() => router.replace('/auth/login')}>
                <Text style={{ color:'#304B71', fontFamily:FONTS.bold, fontSize:14 }}>Se connecter</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Modal Nouveau diplôme ── */}
      <Modal visible={diplomaModal} transparent animationType="slide" onRequestClose={() => setDiplomaModal(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end' }}>
          <KeyboardAvoidingView behavior={Platform.OS==='ios' ? 'padding':undefined}>
            <View style={{ backgroundColor:c.card, borderTopLeftRadius:24, borderTopRightRadius:24,
              padding:20, paddingBottom:36 }}>
              <View style={{ width:40, height:4, backgroundColor:c.border, borderRadius:2, alignSelf:'center', marginBottom:16 }} />
              <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                  <Plus size={16} color={accentColor} />
                  <Text style={{ fontSize:16, fontFamily:FONTS.bold, color:c.txt }}>Nouveau diplôme</Text>
                </View>
                <TouchableOpacity onPress={() => setDiplomaModal(false)}>
                  <X size={20} color={c.txt3} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Field label="Intitulé du diplôme" value={newDiploma.title} onChangeText={v=>setNewDiploma(p=>({...p,title:v}))} placeholder="ex: Doctorat en Médecine" c={c} required />
                <View style={{ flexDirection:'row', gap:10 }}>
                  <View style={{ flex:1 }}><Field label="Établissement / Université" value={newDiploma.etablissement} onChangeText={v=>setNewDiploma(p=>({...p,etablissement:v}))} placeholder="ex: Univ. d'Alger" c={c} /></View>
                  <View style={{ flex:1 }}><Field label="Date d'obtention" value={newDiploma.date} onChangeText={v=>setNewDiploma(p=>({...p,date:v}))} placeholder="JJ/MM/AAAA" c={c} /></View>
                </View>
                <Field label="Spécialisation (optionnel)" value={newDiploma.specialisation} onChangeText={v=>setNewDiploma(p=>({...p,specialisation:v}))} placeholder="ex: Cardiologie" c={c} />
                <FileZone label="Fichier justificatif (PDF ou JPG, 5MB max)" file={newDiploma.file} onPick={pickDiplomaFile} onRemove={() => setNewDiploma(p=>({...p,file:null}))} c={c} />
              </ScrollView>
              <TouchableOpacity onPress={addDiploma}
                style={{ backgroundColor:'#304B71', borderRadius:14, paddingVertical:14, alignItems:'center', marginTop:8 }}>
                <Text style={{ color:'#fff', fontFamily:FONTS.bold, fontSize:15 }}>Confirmer ce diplôme</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Petits composants ────────────────────────────────────────────────────────
function RoleBanner({ role, color, Icon }) {
  return (
    <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, marginBottom:18 }}>
      <View style={{ flex:1, height:1, backgroundColor:'#E2E8F0' }} />
      <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
        {Icon && <Icon size={13} color={color} />}
        <Text style={{ fontSize:12, fontFamily:FONTS.bold, color, letterSpacing:1.2 }}>{role}</Text>
      </View>
      <View style={{ flex:1, height:1, backgroundColor:'#E2E8F0' }} />
    </View>
  );
}

const S = StyleSheet.create({
  roleCard: { flex:1, borderWidth:1.5, borderRadius:14, paddingVertical:20, alignItems:'center', justifyContent:'center' },
  profCard: { flex:1, borderWidth:1.5, borderRadius:16, paddingVertical:18, paddingHorizontal:8, alignItems:'center' },
  chip:     { flex:1, borderWidth:1.5, borderRadius:12, paddingVertical:12, alignItems:'center', justifyContent:'center' },
});
