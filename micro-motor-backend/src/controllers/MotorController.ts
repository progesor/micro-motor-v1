// MotorController.ts

export enum MotorMode {
    NORMAL = 'normal',
    OSCILLATION = 'oscillation',
}

export interface MotorConfig {
    speed: number;           // %0–100
    oscillation: number;     // %0–100
    preRunTime: number;      // Oscillation öncesi net çalışma süresi (ms)
}

export abstract class MotorController {
    protected mode: MotorMode = MotorMode.NORMAL;
    protected config: MotorConfig = {
        speed: 0,
        oscillation: 0,
        preRunTime: 0,
    };

    /**
     * Başlatma komutu.
     * Seçili moda göre:
     * - NORMAL: hemen speed ile çalışır
     * - OSCILLATION: önce preRunTime kadar düz çalışır, sonra oscillation moduna geçer
     */
    abstract start(): Promise<void> | void;

    /** Motoru anında durdurur */
    abstract stop(): Promise<void> | void;

    /** Hızı anlık günceller (%0–100) */
    setSpeed(speed: number) {
        this.config.speed = this.clamp(speed);
        this.onSpeedChange(this.config.speed);
    }

    /** Oscillation şiddetini anlık günceller (%0–100) */
    setOscillation(osc: number) {
        this.config.oscillation = this.clamp(osc);
        this.onOscillationChange(this.config.oscillation);
    }

    /**
     * Çalışma modunu ve (opsiyonel) pre-run süresini ayarlar
     * @param mode MotorMode.NORMAL veya MotorMode.OSCILLATION
     * @param preRunTime Oscillation öncesi çalışma süresi (ms)
     */
    setMode(mode: MotorMode, preRunTime?: number) {
        this.mode = mode;
        if (mode === MotorMode.OSCILLATION && preRunTime != null) {
            this.config.preRunTime = preRunTime;
        }
        this.onModeChange(this.mode, this.config.preRunTime);
    }

    /** Helper: 0–100 arası değeri sınırla */
    protected clamp(value: number) {
        return Math.max(0, Math.min(100, value));
    }

    /** -------------------- Override edilecek callback’ler -------------------- */

    /** Hız değiştiğinde alt sınıflar bunu override edip gerçek PWM yazabilir */
    protected onSpeedChange(_speed: number): void {
        /* empty */
    }

    /** Oscillation değeri değiştiğinde override edilebilir */
    protected onOscillationChange(_osc: number): void {
        /* empty */
    }

    /** Mod veya preRunTime değiştiğinde override edilebilir */
    protected onModeChange(_mode: MotorMode, _preRunTime: number): void {
        /* empty */
    }
}
