import { useT } from "./ui";
const labels: Record<string, string> = {
  "Welcome back": "आपका स्वागत है",
  "Reset your password": "पासवर्ड रीसेट करें",
  "Set a new password": "नया पासवर्ड बनाएँ",
  "Sign in to your organization’s HR workspace.":
    "अपने संगठन के एचआर कार्यक्षेत्र में साइन इन करें।",
  "Secure access to your people workspace.":
    "आपके कार्यक्षेत्र की सुरक्षित पहुँच।",
  "Email ID": "ईमेल आईडी",
  Password: "पासवर्ड",
  "Your organization’s UUID": "आपके संगठन की आईडी",
  "At least 12 characters": "कम से कम 12 अक्षर",
  "Enter your password": "अपना पासवर्ड दर्ज करें",
  "Please wait…": "कृपया प्रतीक्षा करें…",
  "Sign in": "साइन इन",
  "Send recovery link": "रीसेट लिंक भेजें",
  "Save password": "पासवर्ड सहेजें",
  "Forgot your password?": "पासवर्ड भूल गए?",
  "Back to sign in": "साइन इन पर लौटें",
  "Two-step verification": "दो-चरणीय सत्यापन",
  "Set up authenticator": "ऑथेंटिकेटर सेट करें",
  "Six-digit code": "छह अंकों का कोड",
  "Verify and continue": "सत्यापित करें और आगे बढ़ें",
  Cancel: "रद्द करें",
  "Checking…": "जाँच हो रही है…",
  "Access is granted by your administrator.":
    "अनुमति आपके व्यवस्थापक द्वारा दी जाती है।",
  "Need help? Contact your HR team.": "सहायता के लिए एचआर टीम से संपर्क करें।",
  "A PLACE FOR YOUR PEOPLE": "आपकी टीम का कार्यक्षेत्र",
  "Good work starts": "अच्छे काम की शुरुआत",
  "with people.": "लोगों से होती है।",
  "Your password is ready. Sign in to continue.":
    "पासवर्ड तैयार है। आगे बढ़ने के लिए साइन इन करें।",
};
export function useAuthText() {
  const t = useT();
  return (text: string) => t(text, labels[text] ?? text);
}
