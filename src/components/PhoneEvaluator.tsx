import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Smartphone, Battery, AlertCircle, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Step = "welcome" | "model" | "storage" | "battery" | "scratches" | "defects" | "sim" | "result" | "rejected";

interface EvaluationData {
  model: string;
  storage: string;
  battery: string;
  scratches: string;
  defects: string;
  sim: string;
}

const MODELS = [
  "iPhone 13",
  "iPhone 13 mini",
  "iPhone 13 Pro",
  "iPhone 13 Pro Max",
  "iPhone 14",
  "iPhone 14 Plus",
  "iPhone 14 Pro",
  "iPhone 14 Pro Max",
  "iPhone 15",
  "iPhone 15 Plus",
  "iPhone 15 Pro",
  "iPhone 15 Pro Max",
  "iPhone 16",
  "iPhone 16 Plus",
  "iPhone 16 Pro",
  "iPhone 16 Pro Max",
  "iPhone 17",
  "iPhone 17 Pro",
  "iPhone 17 Pro Max",
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

export const PhoneEvaluator = () => {
  const [step, setStep] = useState<Step>("welcome");
  const [data, setData] = useState<EvaluationData>({
    model: "",
    storage: "",
    battery: "",
    scratches: "",
    defects: "",
    sim: "",
  });
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSimSelect = async (sim: string) => {
    const updatedData = { ...data, sim };
    setData(updatedData);
    setIsLoading(true);
    
    try {
      const { error } = await supabase.functions.invoke('save-lead', {
        body: {
          model: updatedData.model,
          storage: updatedData.storage,
          battery: updatedData.battery,
          scratches: updatedData.scratches,
          defects: updatedData.defects,
          sim: updatedData.sim,
          estimated_price: 0,
          sale_timeline: null,
        }
      });

      if (error) {
        console.error('Error saving lead:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось сохранить данные. Попробуйте позже.",
          variant: "destructive",
        });
      }
      
      setStep("result");
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при отправке данных.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = () => {
    setData({
      model: "",
      storage: "",
      battery: "",
      scratches: "",
      defects: "",
      sim: "",
    });
    setRejectionReason("");
    setStep("welcome");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-elevated bg-gradient-to-br from-card to-card/95 border-border/50">
        <div className="p-8 md:p-12">
          {step === "welcome" && (
            <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent">
                <Smartphone className="w-10 h-10 text-primary-foreground" />
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                  Привет 👋
                </h1>
                <p className="text-xl text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Я помогу быстро проверить, подходит ли твой iPhone под условия выкупа.
                  Ответь на несколько вопросов 📱
                </p>
              </div>
              <Button 
                onClick={handleStart} 
                size="lg"
                className="mt-4 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity text-lg px-8 py-6 rounded-2xl shadow-lg"
              >
                Начать оценку
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          )}

          {step === "model" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-foreground">Выбери модель iPhone</h2>
                <p className="text-muted-foreground">Мы выкупаем модели начиная с iPhone 13</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MODELS.map((model) => (
                  <Button
                    key={model}
                    onClick={() => handleModelSelect(model)}
                    variant="outline"
                    className="h-auto py-4 px-6 text-left justify-start hover:bg-primary/10 hover:border-primary transition-all duration-200 rounded-xl"
                  >
                    <Smartphone className="mr-3 w-5 h-5 text-primary" />
                    <span className="font-medium">{model}</span>
                  </Button>
                ))}
              </div>
              <Button 
                onClick={() => setStep("welcome")} 
                variant="ghost"
                className="w-full mt-4"
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
              <div className="grid grid-cols-2 gap-3">
                {STORAGE_OPTIONS.map((storage) => (
                  <Button
                    key={storage}
                    onClick={() => handleStorageSelect(storage)}
                    variant="outline"
                    className="h-24 text-xl font-semibold hover:bg-primary/10 hover:border-primary transition-all duration-200 rounded-xl"
                  >
                    {storage}
                  </Button>
                ))}
              </div>
              <Button 
                onClick={() => setStep("model")} 
                variant="ghost"
                className="w-full mt-4"
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
                      "h-16 font-medium hover:bg-primary/10 hover:border-primary transition-all duration-200 rounded-xl",
                      battery === "Ниже 85%" && "text-destructive hover:bg-destructive/10 hover:border-destructive"
                    )}
                  >
                    {battery}
                  </Button>
                ))}
              </div>
              <Button 
                onClick={() => setStep("storage")} 
                variant="ghost"
                className="w-full mt-4"
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
                onClick={() => setStep("battery")} 
                variant="ghost"
                className="w-full mt-4"
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
                onClick={() => setStep("scratches")} 
                variant="ghost"
                className="w-full mt-4"
              >
                ← Назад
              </Button>
            </div>
          )}

          {step === "sim" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-foreground">Какая версия SIM-карт?</h2>
                <p className="text-muted-foreground">Последний вопрос!</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {SIM_OPTIONS.map((sim) => (
                  <Button
                    key={sim}
                    onClick={() => handleSimSelect(sim)}
                    variant="outline"
                    disabled={isLoading}
                    className="h-20 text-lg hover:bg-primary/10 hover:border-primary transition-all duration-200 rounded-xl"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                    {sim}
                  </Button>
                ))}
              </div>
              <Button 
                onClick={() => setStep("defects")} 
                variant="ghost"
                className="w-full mt-4"
                disabled={isLoading}
              >
                ← Назад
              </Button>
            </div>
          )}

          {step === "result" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent">
                  <CheckCircle2 className="w-10 h-10 text-primary-foreground" />
                </div>
                <h2 className="text-3xl font-bold text-foreground">Отлично! 🎉</h2>
              </div>

              <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-8 text-center space-y-4 border border-primary/20">
                <p className="text-lg text-muted-foreground">Актуальная оценка на сегодня/завтра:</p>
                <p className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {estimatedPrice.toLocaleString('ru-RU')} ₽
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-center text-lg font-medium text-foreground">Когда планировал продать?</p>
                <div className="grid grid-cols-1 gap-3">
                  <Button 
                    variant="outline"
                    onClick={() => handleTimelineSelect("Сегодня/завтра")}
                    disabled={isLoading}
                    className="h-16 text-lg hover:bg-primary/10 hover:border-primary transition-all duration-200 rounded-xl"
                  >
                    {isLoading && <Loader2 className="w-5 h-5 animate-spin mr-2" />}
                    Сегодня/завтра
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleTimelineSelect("В течение недели")}
                    disabled={isLoading}
                    className="h-16 text-lg hover:bg-primary/10 hover:border-primary transition-all duration-200 rounded-xl"
                  >
                    {isLoading && <Loader2 className="w-5 h-5 animate-spin mr-2" />}
                    В течение недели
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleTimelineSelect("Позже")}
                    disabled={isLoading}
                    className="h-16 text-lg hover:bg-primary/10 hover:border-primary transition-all duration-200 rounded-xl"
                  >
                    {isLoading && <Loader2 className="w-5 h-5 animate-spin mr-2" />}
                    Позже
                  </Button>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={handleRestart}
                  variant="ghost"
                  className="w-full"
                >
                  Начать новую оценку
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
                  className="mt-4 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                >
                  Попробовать снова
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
