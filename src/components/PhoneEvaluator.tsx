import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Smartphone, Battery, AlertCircle, CheckCircle2, ChevronRight, Loader2, Check, MessageCircle, Mic, TrendingUp, Zap, Send, Copy } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useSwipeable } from "react-swipeable";
import logo from "@/assets/eoffer-logo.jpg";

type Step = "welcome" | "model" | "storage" | "battery" | "scratches" | "defects" | "sim" | "accessories" | "timeline" | "result" | "rejected";

interface EvaluationData {
  model: string;
  storage: string;
  battery: string;
  scratches: string;
  defects: string;
  sim: string;
  accessories: string;
  timeline: string;
}

const MODELS = [
  "iPhone 17 Pro Max",
  "iPhone 17 Pro",
  "iPhone 17 Air",
  "iPhone 17",
  "iPhone 16 Pro Max",
  "iPhone 16 Pro",
  "iPhone 16 Plus",
  "iPhone 16",
  "iPhone 15 Pro Max",
  "iPhone 15 Pro",
  "iPhone 15 Plus",
  "iPhone 15",
  "iPhone 14 Pro Max",
  "iPhone 14 Pro",
  "iPhone 14 Plus",
  "iPhone 14",
  "iPhone 13 Pro Max",
  "iPhone 13 Pro",
  "iPhone 13 mini",
  "iPhone 13",
];

const POPULAR_MODELS = [
  "iPhone 16 Pro Max",
  "iPhone 15 Pro Max",
  "iPhone 16 Pro",
];

const UNSUITABLE_MODELS = [
  "iPhone 12", 
  "iPhone 12 mini", 
  "iPhone 12 Pro", 
  "iPhone 12 Pro Max",
  "iPhone 11",
  "iPhone 11 Pro",
  "iPhone 11 Pro Max",
  "iPhone XS",
  "iPhone XR",
  "iPhone X",
  "iPhone 8",
  "iPhone 7",
  "iPhone SE",
];

const STORAGE_OPTIONS = ["128GB", "256GB", "512GB", "1TB"];

const BATTERY_OPTIONS = [
  "100%", "99%", "98%", "97%", "96%", "95%", 
  "94%", "93%", "92%", "91%", "90%", 
  "89%", "88%", "87%", "86%", "85%",
  "Ниже 85%"
];

const SIM_OPTIONS = ["SIM + eSIM", "2 SIM", "eSIM"];

const TIMELINE_OPTIONS = ["Сегодня-завтра", "На неделе", "В этом месяце"];

export const PhoneEvaluator = () => {
  const [step, setStep] = useState<Step>("welcome");
  const [data, setData] = useState<EvaluationData>({
    model: "",
    storage: "",
    battery: "",
    scratches: "",
    defects: "",
    sim: "",
    accessories: "",
    timeline: "",
  });
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Auto-scroll to continue button after 1.5 seconds if not visible
  useEffect(() => {
    if (step === "accessories" || step === "result") {
      const timer = setTimeout(() => {
        if (continueButtonRef.current) {
          const rect = continueButtonRef.current.getBoundingClientRect();
          const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
          if (!isVisible) {
            continueButtonRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [step, selectedAccessories]);

  // Reset scroll position when step changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [step]);

  const steps: Step[] = ["welcome", "model", "storage", "battery", "scratches", "defects", "sim", "accessories", "timeline", "result"];
  const currentStepIndex = steps.indexOf(step);
  const progress = step === "welcome" ? 0 : ((currentStepIndex) / (steps.length - 2)) * 100;

  const handleStart = () => {
    setStep("model");
  };

  const handleModelSelect = (model: string) => {
    setData({ ...data, model });
    setStep("storage");
  };

  const handleStorageSelect = (storage: string) => {
    setData({ ...data, storage });
    setStep("battery");
  };

  const handleBatterySelect = (battery: string) => {
    if (battery === "Ниже 85%") {
      setRejectionReason("Мы выкупаем устройства только с аккумулятором от 85% и выше 🔋\nЭтот iPhone не подходит под условия выкупа, к сожалению.");
      setStep("rejected");
      return;
    }
    setData({ ...data, battery });
    setStep("scratches");
  };

  const handleScratchesSelect = (scratches: string) => {
    setData({ ...data, scratches });
    setStep("defects");
  };

  const handleDefectsSelect = (defects: string) => {
    if (defects === "Да") {
      setRejectionReason("К сожалению, мы не выкупаем телефоны с дефектами, нерабочими функциями или заменёнными деталями 😔");
      setStep("rejected");
      return;
    }
    setData({ ...data, defects });
    setStep("sim");
  };

  const handleSimSelect = (sim: string) => {
    setData({ ...data, sim });
    setStep("accessories");
  };

  const toggleAccessory = (accessory: string) => {
    setSelectedAccessories(prev => 
      prev.includes(accessory) 
        ? prev.filter(item => item !== accessory)
        : [...prev, accessory]
    );
  };

  const handleAccessoriesContinue = () => {
    const accessoriesText = selectedAccessories.length > 0 
      ? selectedAccessories.join(", ") 
      : "Ничего";
    
    setData({ ...data, accessories: accessoriesText });
    setStep("timeline");
  };

  const handleTimelineSelect = (timeline: string) => {
    const updatedData = { ...data, timeline };
    setData(updatedData);
    
    // Переход сразу, сохранение в фоне
    setStep("result");
    
    // Сохраняем данные в фоне без блокировки UI
    supabase.functions.invoke('save-lead', {
      body: {
        model: updatedData.model,
        storage: updatedData.storage,
        battery: updatedData.battery,
        scratches: updatedData.scratches,
        defects: updatedData.defects,
        sim: updatedData.sim,
        accessories: updatedData.accessories,
        estimated_price: 0,
        sale_timeline: timeline,
      }
    }).catch((error) => {
      console.error('Error saving lead:', error);
    });
  };

  const handleRestart = () => {
    setData({
      model: "",
      storage: "",
      battery: "",
      scratches: "",
      defects: "",
      sim: "",
      accessories: "",
      timeline: "",
    });
    setSelectedAccessories([]);
    setRejectionReason("");
    setStep("welcome");
  };

  const goBack = () => {
    const stepMap: Record<Step, Step> = {
      welcome: "welcome",
      model: "welcome",
      storage: "model",
      battery: "storage",
      scratches: "battery",
      defects: "scratches",
      sim: "defects",
      accessories: "sim",
      timeline: "accessories",
      result: "timeline",
      rejected: "welcome",
    };
    setStep(stepMap[step]);
  };

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      toast({
        title: "Не поддерживается",
        description: "Ваш браузер не поддерживает голосовой ввод",
        variant: "destructive",
      });
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.continuous = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      toast({
        title: "Распознано",
        description: transcript,
      });
    };

    recognition.start();
  };

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      // Свайп влево - вперед (но мы не можем пропускать шаги)
    },
    onSwipedRight: () => {
      // Свайп вправо - назад
      if (step !== "welcome" && step !== "result" && step !== "rejected") {
        goBack();
      }
    },
    trackMouse: false,
  });

  // Превью текущих данных
  const hasData = data.model || data.storage || data.battery;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex flex-col">
      {/* Липкий прогресс-бар */}
      {step !== "welcome" && step !== "result" && step !== "rejected" && (
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50 p-4">
          <div className="max-w-2xl mx-auto space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">
                Шаг {currentStepIndex} из {steps.length - 2}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto" {...handlers}>
        <Card className="w-full max-w-2xl shadow-elevated bg-gradient-to-br from-card to-card/95 border-border/50">
          <div ref={containerRef} className="p-6 md:p-12 max-h-[calc(100vh-120px)] overflow-y-auto">
            {step === "welcome" && (
              <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col items-center space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse"></div>
                    <img 
                      src={logo} 
                      alt="eOffer" 
                      className="relative w-32 h-32 object-contain drop-shadow-2xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-primary tracking-wider uppercase">
                      Сервис выкупа iPhone
                    </p>
                  </div>
                </div>
                <div className="space-y-4 pt-2">
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
                    Узнай стоимость<br />своего iPhone 👋
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
                    Ответь на несколько вопросов и получи предварительную оценку за минуту
                  </p>
                </div>
                <Button 
                  onClick={handleStart} 
                  className="w-full h-16 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                >
                  Начать оценку
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            )}

            {step === "model" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-foreground flex items-center justify-between">
                    Выбери модель iPhone
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={startVoiceInput}
                      className={cn("h-10 w-10", isListening && "text-primary animate-pulse")}
                    >
                      <Mic className="h-5 w-5" />
                    </Button>
                  </h2>
                  <p className="text-muted-foreground">Мы выкупаем модели начиная с iPhone 13</p>
                </div>

                {/* Популярные модели */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <TrendingUp className="w-4 h-4" />
                    <span>Популярные модели</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {POPULAR_MODELS.map((model) => (
                      <Button
                        key={model}
                        onClick={() => handleModelSelect(model)}
                        variant="outline"
                        className="h-16 px-6 text-left justify-start hover:bg-primary/10 hover:border-primary transition-all duration-200 rounded-xl bg-primary/5 border-primary/30"
                      >
                        <Zap className="mr-3 w-6 h-6 text-primary" />
                        <span className="font-semibold text-lg">{model}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Все модели */}
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-muted-foreground">Все модели</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {MODELS.map((model) => (
                      <Button
                        key={model}
                        onClick={() => handleModelSelect(model)}
                        variant="outline"
                        className="h-14 px-6 text-left justify-start hover:bg-primary/10 hover:border-primary transition-all duration-200 rounded-xl"
                      >
                        <Smartphone className="mr-3 w-5 h-5 text-primary" />
                        <span className="font-medium">{model}</span>
                      </Button>
                    ))}
                  </div>
                </div>
                <Button 
                  onClick={goBack}
                  variant="ghost"
                  className="w-full h-14"
                >
                  ← Назад
                </Button>
              </div>
            )}

            {step === "storage" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-foreground">Объем памяти</h2>
                  <p className="text-muted-foreground">Модель: {data.model}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {STORAGE_OPTIONS.map((storage) => (
                    <Button
                      key={storage}
                      onClick={() => handleStorageSelect(storage)}
                      variant="outline"
                      className="h-28 text-2xl font-bold hover:bg-primary/10 hover:border-primary transition-all duration-200 rounded-2xl border-2"
                    >
                      {storage}
                    </Button>
                  ))}
                </div>
                <Button 
                  onClick={goBack}
                  variant="ghost"
                  className="w-full h-14"
                >
                  ← Назад
                </Button>
              </div>
            )}

            {step === "battery" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
                    <Battery className="w-8 h-8 text-primary" />
                    Состояние аккумулятора
                  </h2>
                  <p className="text-muted-foreground">Выбери ёмкость батареи в процентах</p>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {BATTERY_OPTIONS.map((battery) => (
                    <Button
                      key={battery}
                      onClick={() => handleBatterySelect(battery)}
                      variant="outline"
                      className={cn(
                        "h-14 font-medium hover:bg-primary/10 hover:border-primary transition-all duration-200 rounded-xl",
                        battery === "Ниже 85%" && "text-destructive hover:bg-destructive/10 hover:border-destructive"
                      )}
                    >
                      {battery}
                    </Button>
                  ))}
                </div>
                <Button 
                  onClick={goBack}
                  variant="ghost"
                  className="w-full h-14"
                >
                  ← Назад
                </Button>
              </div>
            )}

            {step === "scratches" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-foreground">Есть царапины на корпусе или экране?</h2>
                  <p className="text-muted-foreground">Будь честен, это важно для оценки</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => handleScratchesSelect("Да")}
                    variant="outline"
                    className="h-32 text-xl hover:bg-primary/10 hover:border-primary transition-all duration-200 rounded-xl"
                  >
                    Да
                  </Button>
                  <Button
                    onClick={() => handleScratchesSelect("Нет")}
                    variant="outline"
                    className="h-32 text-xl hover:bg-primary/10 hover:border-primary transition-all duration-200 rounded-xl"
                  >
                    Нет
                  </Button>
                </div>
                <Button 
                  onClick={goBack}
                  variant="ghost"
                  className="w-full h-14"
                >
                  ← Назад
                </Button>
              </div>
            )}

            {step === "defects" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-foreground">Есть дефекты, нерабочие функции или замены деталей?</h2>
                  <p className="text-muted-foreground">Например: не работает камера, менялся экран и т.д.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => handleDefectsSelect("Да")}
                    variant="outline"
                    className="h-32 text-xl hover:bg-destructive/10 hover:border-destructive text-destructive transition-all duration-200 rounded-xl"
                  >
                    Да
                  </Button>
                  <Button
                    onClick={() => handleDefectsSelect("Нет")}
                    variant="outline"
                    className="h-32 text-xl hover:bg-primary/10 hover:border-primary transition-all duration-200 rounded-xl"
                  >
                    Нет
                  </Button>
                </div>
                <Button 
                  onClick={goBack}
                  variant="ghost"
                  className="w-full h-14"
                >
                  ← Назад
                </Button>
              </div>
            )}

            {step === "sim" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-foreground">Какая версия SIM-карт?</h2>
                  <p className="text-muted-foreground">Почти закончили!</p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {SIM_OPTIONS.map((sim) => (
                    <Button
                      key={sim}
                      onClick={() => handleSimSelect(sim)}
                      variant="outline"
                      className="h-20 text-lg hover:bg-primary/10 hover:border-primary transition-all duration-200 rounded-xl"
                    >
                      {sim}
                    </Button>
                  ))}
                </div>
                <Button 
                  onClick={goBack}
                  variant="ghost"
                  className="w-full h-14"
                >
                  ← Назад
                </Button>
              </div>
            )}

            {step === "accessories" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-foreground">Что есть в комплекте?</h2>
                  <p className="text-muted-foreground">Выбери всё, что есть</p>
                </div>
                
                <div className="space-y-4">
                  {["Коробка", "Кабель", "Чек"].map((item) => (
                    <div
                      key={item}
                      onClick={() => toggleAccessory(item)}
                      className={cn(
                        "flex items-center space-x-4 p-6 rounded-xl border-2 transition-all duration-200 cursor-pointer",
                        selectedAccessories.includes(item)
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50 hover:bg-primary/5"
                      )}
                    >
                      <div
                        className={cn(
                          "h-6 w-6 rounded border-2 flex items-center justify-center transition-colors",
                          selectedAccessories.includes(item)
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        )}
                      >
                        {selectedAccessories.includes(item) && (
                          <Check className="h-4 w-4 text-primary-foreground" />
                        )}
                      </div>
                      <span className="text-lg font-medium">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 space-y-3">
                  <Button
                    ref={continueButtonRef}
                    onClick={handleAccessoriesContinue}
                    disabled={isLoading}
                    className="w-full h-14 text-lg bg-gradient-to-r from-primary to-accent hover:opacity-90 rounded-xl"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                    Продолжить
                  </Button>
                  <Button 
                    onClick={goBack}
                    variant="ghost"
                    className="w-full h-14"
                    disabled={isLoading}
                  >
                    ← Назад
                  </Button>
                </div>
              </div>
            )}

            {step === "timeline" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-foreground">Когда хотели бы продать?</h2>
                  <p className="text-muted-foreground">Последний вопрос!</p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {TIMELINE_OPTIONS.map((timeline) => (
                    <Button
                      key={timeline}
                      onClick={() => handleTimelineSelect(timeline)}
                      disabled={isLoading}
                      variant="outline"
                      className="h-20 text-lg hover:bg-primary/10 hover:border-primary transition-all duration-200 rounded-xl"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                      {timeline}
                    </Button>
                  ))}
                </div>
                <Button 
                  onClick={goBack}
                  variant="ghost"
                  className="w-full h-14"
                  disabled={isLoading}
                >
                  ← Назад
                </Button>
              </div>
            )}

            {step === "result" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent">
                    <CheckCircle2 className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <h2 className="text-3xl font-bold text-foreground">Отлично! 🎉</h2>
                </div>

                <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-6 space-y-4 border border-primary/20">
                  <div className="text-center space-y-2">
                    <p className="text-lg font-semibold text-foreground">Ваш iPhone подходит!</p>
                    <p className="text-muted-foreground">
                      Свяжитесь с менеджером для оценки
                    </p>
                  </div>

                  <div className="bg-card/80 rounded-xl p-4 space-y-1 text-sm">
                    <p className="font-medium text-foreground">📱 {data.model} {data.storage}</p>
                    <p className="text-muted-foreground">🔋 {data.battery} • {data.scratches === "Да" ? "Царапины" : "Без царапин"}</p>
                    <p className="text-muted-foreground">📦 {data.accessories}</p>
                    <p className="text-muted-foreground">⏰ {data.timeline}</p>
                  </div>

                  <div className="space-y-3">
                    {/* WhatsApp Button */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/40 rounded-xl blur-md animate-pulse"></div>
                      <Button
                        ref={continueButtonRef}
                        onClick={() => {
                          const message = `👋 Добрый день! Интересует оценка:\n\n📱 Модель: ${data.model} ${data.storage}\n🔋 Аккумулятор: ${data.battery}\n✨ Царапины: ${data.scratches}\n📦 Комплект: ${data.accessories}\n⏰ Сроки: ${data.timeline}`;
                          const encodedMessage = encodeURIComponent(message);
                          window.open(`https://api.whatsapp.com/send/?phone=79375723173&text=${encodedMessage}&type=phone_number&app_absent=0`, '_blank');
                        }}
                        className="relative w-full h-14 text-lg bg-gradient-to-r from-primary to-accent hover:opacity-90 rounded-xl shadow-lg"
                      >
                        <MessageCircle className="mr-2 h-5 w-5" />
                        Связаться в WhatsApp
                      </Button>
                    </div>

                    {/* Telegram Button */}
                    <Button
                      onClick={() => {
                        const message = `👋 Добрый день! Интересует оценка:\n\n📱 Модель: ${data.model} ${data.storage}\n🔋 Аккумулятор: ${data.battery}\n✨ Царапины: ${data.scratches}\n📦 Комплект: ${data.accessories}\n⏰ Сроки: ${data.timeline}`;
                        const encodedMessage = encodeURIComponent(message);
                        window.open(`https://t.me/eofffer?text=${encodedMessage}`, '_blank');
                      }}
                      variant="outline"
                      className="w-full h-14 text-lg rounded-xl border-2 border-[#229ED9] text-[#229ED9] hover:bg-[#229ED9]/10"
                    >
                      <Send className="mr-2 h-5 w-5" />
                      Связаться в Telegram
                    </Button>

                    {/* Max Button */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={async () => {
                              const message = `👋 Добрый день! Интересует оценка:\n\n📱 Модель: ${data.model} ${data.storage}\n🔋 Аккумулятор: ${data.battery}\n✨ Царапины: ${data.scratches}\n📦 Комплект: ${data.accessories}\n⏰ Сроки: ${data.timeline}`;
                              await navigator.clipboard.writeText(message);
                              toast({
                                title: "Скопировано!",
                                description: "Сообщение скопировано, вставьте его в чат",
                              });
                              window.open(`https://max.ru/u/f9LHodD0cOJSzg_7ouewijiGCO0kc--KBjIIv9Nv43oUCDTGNVFD7RM-Vcg`, '_blank');
                            }}
                            variant="outline"
                            className="w-full h-14 text-lg rounded-xl"
                            style={{ borderColor: '#8B5CF6', borderWidth: '2px', color: '#8B5CF6' }}
                          >
                            <Copy className="mr-2 h-5 w-5" />
                            <span className="flex flex-col items-start leading-tight">
                              <span>Связаться в Max</span>
                              <span className="text-xs opacity-70">(нажмите «Вставить» в чате)</span>
                            </span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Сообщение скопируется автоматически</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={() => setStep("timeline")}
                    variant="ghost"
                    className="flex-1 h-12"
                  >
                    ← Назад
                  </Button>
                  <Button 
                    onClick={handleRestart} 
                    variant="outline"
                    className="flex-1 h-12"
                  >
                    Заново
                  </Button>
                </div>
              </div>
            )}

            {step === "rejected" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/20">
                    <AlertCircle className="w-10 h-10 text-destructive" />
                  </div>
                  <h2 className="text-3xl font-bold text-foreground">К сожалению...</h2>
                </div>

                <div className="bg-destructive/10 rounded-2xl p-8 text-center border border-destructive/20">
                  <p className="text-lg text-foreground whitespace-pre-line leading-relaxed">
                    {rejectionReason}
                  </p>
                </div>

                <div className="text-center space-y-4 pt-4">
                  <p className="text-muted-foreground">
                    Мы выкупаем модели начиная с iPhone 13,<br />
                    с АКБ от 85% и без дефектов
                  </p>
                  <Button 
                    onClick={handleRestart}
                    className="mt-4 h-14 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                  >
                    Попробовать снова
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Превью результата снизу */}
      {hasData && step !== "welcome" && step !== "result" && step !== "rejected" && (
        <div className="sticky bottom-0 z-40 bg-gradient-to-t from-background via-background to-background/90 backdrop-blur-sm border-t border-border/50 p-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-card/50 rounded-xl p-4 space-y-2 border border-primary/20">
              <p className="text-xs font-semibold text-primary">Текущий выбор:</p>
              <div className="flex flex-wrap gap-2 text-sm">
                {data.model && <span className="bg-primary/10 text-primary px-2 py-1 rounded">📱 {data.model}</span>}
                {data.storage && <span className="bg-primary/10 text-primary px-2 py-1 rounded">💾 {data.storage}</span>}
                {data.battery && <span className="bg-primary/10 text-primary px-2 py-1 rounded">🔋 {data.battery}</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
