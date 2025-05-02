// src/controllers/DcMotorController.ts

import { Gpio } from 'onoff';
import {
    MotorController,
    MotorMode,
    MotorConfig
} from './MotorController';

export class DcMotorController extends MotorController {
    private in1: Gpio;
    private in2: Gpio;
    private ena: Gpio;

    private pwmInterval?: NodeJS.Timeout;
    private oscInterval?: NodeJS.Timeout;

    /**
     * @param in1Pin IN1 pini (GPIO numarası)
     * @param in2Pin IN2 pini
     * @param enaPin ENA pini (PWM yerine yazılım PWM simülasyonu)
     */
    constructor(in1Pin: number, in2Pin: number, enaPin: number) {
        super();
        this.in1 = new Gpio(in1Pin, 'out');
        this.in2 = new Gpio(in2Pin, 'out');
        this.ena = new Gpio(enaPin, 'out');
    }

    /** Motoru seçili moda göre başlatır */
    start(): void {
        // Önce eski interval’ları temizle
        this.clearIntervals();

        if (this.mode === MotorMode.NORMAL) {
            // Düz çalışma
            this.in1.writeSync(1);
            this.in2.writeSync(0);
            this.applyPWM(this.config.speed);
        } else {
            // Oscillation modu
            this.in1.writeSync(1);
            this.in2.writeSync(0);
            this.applyPWM(this.config.speed);

            // Ön çalışma süresi sonra salınıma geç
            setTimeout(() => {
                this.startOscillation();
            }, this.config.preRunTime);
        }
    }

    /** Motoru anında durdurur */
    stop(): void {
        this.clearIntervals();
        this.ena.writeSync(0);
        this.in1.writeSync(0);
        this.in2.writeSync(0);
    }

    /** Hız değiştiğinde çağrılır */
    protected onSpeedChange(speed: number): void {
        if (this.mode === MotorMode.NORMAL) {
            this.applyPWM(speed);
        }
    }

    /** Oscillation şiddeti değiştiğinde çağrılır */
    protected onOscillationChange(_osc: number): void {
        if (this.mode === MotorMode.OSCILLATION) {
            this.startOscillation();
        }
    }

    /** Mod veya preRunTime değiştiğinde çağrılır */
    protected onModeChange(_mode: MotorMode, _preRunTime: number): void {
        // İptal: bir sonraki start() çağrısında temizlenecek
        this.clearIntervals();
    }

    /** Yazılım tabanlı PWM ile hız uygular (%0–100) */
    private applyPWM(speed: number) {
        if (this.pwmInterval) clearInterval(this.pwmInterval);

        // 0’da motor durur
        if (speed <= 0) {
            this.ena.writeSync(0);
            return;
        }

        // on/off sürelerini ms cinsinden ayarlıyoruz
        const onTime = speed;           // ms
        const offTime = 100 - speed;    // ms

        this.pwmInterval = setInterval(() => {
            this.ena.writeSync(1);
            setTimeout(() => this.ena.writeSync(0), onTime);
        }, onTime + offTime);
    }

    /** Oscillation modu: periyot bazlı yön değiştirir */
    private startOscillation() {
        // PWM’i devam ettir
        this.applyPWM(this.config.speed);

        // Önce eskilerini temizle
        if (this.oscInterval) clearInterval(this.oscInterval);

        // Salınım frekansını period olarak hesapla
        const period = this.calculateOscInterval(this.config.oscillation);

        this.oscInterval = setInterval(() => {
            // Yönü tersine çevir
            const state = this.in1.readSync();
            if (state === 1) {
                this.in1.writeSync(0);
                this.in2.writeSync(1);
            } else {
                this.in1.writeSync(1);
                this.in2.writeSync(0);
            }
        }, period);
    }

    /** %0→100 map’i 1000–100ms aralığına dönüştürür */
    private calculateOscInterval(osc: number): number {
        const min = 100;    // ms (yüksek frekans)
        const max = 1000;   // ms (düşük frekans)
        return max - (osc / 100) * (max - min);
    }

    /** Tüm interval’ları temizler */
    private clearIntervals() {
        if (this.pwmInterval) {
            clearInterval(this.pwmInterval);
            this.pwmInterval = undefined;
        }
        if (this.oscInterval) {
            clearInterval(this.oscInterval);
            this.oscInterval = undefined;
        }
    }
}
