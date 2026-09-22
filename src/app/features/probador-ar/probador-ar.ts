import {
  Component,
  ElementRef,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FilesetResolver, PoseLandmarker, PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import * as THREE from 'three';

interface Prenda3D {
  id: number;
  nombre: string;
  categoria: string;
  colorHex: string;
  tipoMalla: 'chaqueta' | 'sueter' | 'polera' | 'vestido';
  precio: number;
  fotoUrl: string;
}

interface MetricasCuerpo {
  detectado: boolean;
  confianza: number;
  anchoHombrosPx: number;
  altoTorsoPx: number;
  inclinacionGrados: number;
  centroPechoX: number;
  centroPechoY: number;
  tallaSugerida: string;
}

@Component({
  selector: 'app-probador-ar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="ar-container">
      <!-- Barra Superior -->
      <header class="ar-header">
        <div>
          <div class="ar-badge">
            <span class="ar-badge-pulse"></span>
            Fase 2: Motor 3D Three.js & Calce Textil en Tiempo Real
          </div>
          <h1 class="ar-title">Probador Virtual AR 3D &middot; FashionStore</h1>
          <p class="ar-subtitle">
            Google MediaPipe BlazePose (33 Landmarks) + Three.js WebGL (Mapeo Cinemático 3D)
          </p>
        </div>

        <div class="ar-actions">
          <a routerLink="/catalogo" class="ar-btn-back">
            &larr; Volver al Catálogo
          </a>
        </div>
      </header>

      <!-- Layout Principal en 2 Columnas -->
      <div class="ar-grid">
        
        <!-- Columna Izquierda: Visor Dual (MediaPipe + Three.js) -->
        <div class="ar-viewport-card">
          <!-- Barra de Herramientas Superior -->
          <div class="ar-toolbar">
            <div class="ar-sources">
              <span class="ar-label">Fuente:</span>
              <button
                type="button"
                (click)="seleccionarModo('demo1')"
                [class.active]="modo() === 'demo1'"
                class="ar-pill"
              >
                Modelo 1 (Frente)
              </button>
              <button
                type="button"
                (click)="seleccionarModo('demo2')"
                [class.active]="modo() === 'demo2'"
                class="ar-pill"
              >
                Modelo 2 (Casual)
              </button>
              <button
                type="button"
                (click)="seleccionarModo('webcam')"
                [class.active-cam]="modo() === 'webcam'"
                class="ar-pill cam-pill"
              >
                📹 Webcam Laptop
              </button>
              <label class="ar-pill upload-pill">
                📁 Subir Foto
                <input type="file" accept="image/*" class="sr-only" (change)="onArchivoSeleccionado($event)" />
              </label>
            </div>

            <!-- Toggles de Capas Visuales -->
            <div class="ar-toggles">
              <label class="ar-toggle">
                <input type="checkbox" [checked]="mostrarRopa3D()" (change)="toggleRopa3D()">
                <strong class="text-indigo-400">Prenda 3D</strong>
              </label>
              <label class="ar-toggle">
                <input type="checkbox" [checked]="mostrarEsqueleto()" (change)="toggleEsqueleto()">
                Esqueleto
              </label>
              <label class="ar-toggle">
                <input type="checkbox" [checked]="mostrarLandmarks()" (change)="toggleLandmarks()">
                Landmarks
              </label>
            </div>
          </div>

          <!-- Escenario Dual de Renderizado -->
          <div class="ar-stage" #stageContainer>
            @if (cargandoModelo()) {
              <div class="ar-loading-overlay">
                <div class="ar-spinner"></div>
                <div class="ar-loading-text">Cargando Google MediaPipe & Motor Three.js...</div>
                <div class="ar-loading-sub">Preparando contexto WebGL acelerado por hardware</div>
              </div>
            }

            <video #videoElement class="hidden" playsinline autoplay muted></video>
            <img #imgElement class="hidden" crossOrigin="anonymous" alt="Modelo de prueba" />

            <!-- Capa 1: Video o Imagen con tracking 2D de MediaPipe -->
            <canvas #canvasOutput class="ar-canvas"></canvas>

            <!-- Capa 2: Three.js WebGL Transparente Superpuesto -->
            <canvas #canvasThree class="ar-canvas-three" [class.hidden]="!mostrarRopa3D()"></canvas>

            <!-- Badge de Estado en Vivo -->
            <div class="ar-status-tag" [class.success]="metricas().detectado">
              <span class="status-dot"></span>
              {{ metricas().detectado ? 'Cuerpo Vinculado · Prenda 3D Anclada' : 'Buscando postura corporal...' }}
            </div>
          </div>

          <!-- Carrusel Inferior de Prendas del Catálogo -->
          <div class="ar-garments-tray">
            <div class="tray-label">Elige una prenda del catálogo para probarte:</div>
            <div class="garments-list">
              @for (prenda of catalogoPrendas; track prenda.id) {
                <div
                  class="garment-card"
                  [class.selected]="prendaSeleccionada().id === prenda.id"
                  (click)="seleccionarPrenda(prenda)"
                >
                  <div class="garment-thumb-wrap">
                    <img [src]="prenda.fotoUrl" [alt]="prenda.nombre" class="garment-thumb" />
                    <span class="color-dot" [style.background]="prenda.colorHex"></span>
                  </div>
                  <div class="garment-info">
                    <div class="garment-name">{{ prenda.nombre }}</div>
                    <div class="garment-price">Bs. {{ prenda.precio | number:'1.2-2' }}</div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Columna Derecha: Panel de Ajustes y Telemetría -->
        <div class="ar-sidebar">
          
          <!-- Tarjeta 1: Control de Calce de la Prenda -->
          <div class="ar-card">
            <h2 class="ar-card-title">
              🎛️ Calibración Fina de la Prenda 3D
            </h2>
            
            <div class="ar-slider-group">
              <div class="slider-header">
                <span>Escala / Holgura (Ancho):</span>
                <strong>{{ escalaManual() }}x</strong>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.5"
                step="0.05"
                [value]="escalaManual()"
                (input)="cambiarEscalaManual($event)"
                class="ar-range"
              />
            </div>

            <div class="ar-slider-group">
              <div class="slider-header">
                <span>Ajuste Vertical (Cuello):</span>
                <strong>{{ offsetVertical() }}px</strong>
              </div>
              <input
                type="range"
                min="-60"
                max="60"
                step="5"
                [value]="offsetVertical()"
                (input)="cambiarOffsetVertical($event)"
                class="ar-range"
              />
            </div>

            <div class="ar-slider-group">
              <div class="slider-header">
                <span>Opacidad de la Tela:</span>
                <strong>{{ (opacidadTela() * 100) | number:'1.0-0' }}%</strong>
              </div>
              <input
                type="range"
                min="0.3"
                max="1.0"
                step="0.05"
                [value]="opacidadTela()"
                (input)="cambiarOpacidad($event)"
                class="ar-range"
              />
            </div>
          </div>

          <!-- Tarjeta 2: Telemetría de Cinemática 3D -->
          <div class="ar-card">
            <h2 class="ar-card-title">
              📐 Cinemática Corporal & Ángulos 3D
            </h2>

            <div class="ar-stats-grid">
              <div class="ar-stat-box">
                <div class="stat-name">Ancho Hombros</div>
                <div class="stat-val indigo">
                  {{ metricas().anchoHombrosPx | number:'1.0-0' }} <span class="unit">px</span>
                </div>
                <div class="stat-detail">Distancia euclidiana</div>
              </div>

              <div class="ar-stat-box">
                <div class="stat-name">Alto Torso</div>
                <div class="stat-val cyan">
                  {{ metricas().altoTorsoPx | number:'1.0-0' }} <span class="unit">px</span>
                </div>
                <div class="stat-detail">Hombros &harr; Cadera</div>
              </div>

              <div class="ar-stat-box">
                <div class="stat-name">Inclinación (Roll)</div>
                <div class="stat-val amber">
                  {{ metricas().inclinacionGrados | number:'1.1-1' }}&deg;
                </div>
                <div class="stat-detail">Rotación en eje Z</div>
              </div>

              <div class="ar-stat-box">
                <div class="stat-name">Talla Sugerida</div>
                <div class="stat-val emerald">
                  {{ metricas().tallaSugerida }}
                </div>
                <div class="stat-detail">Ajuste recomendado</div>
              </div>
            </div>

            <!-- Coordenadas Three.js -->
            <div class="ar-code-box">
              <div><span>Anclaje 3D X:</span> <strong>{{ coordThreeX | number:'1.2-2' }}</strong></div>
              <div><span>Anclaje 3D Y:</span> <strong>{{ coordThreeY | number:'1.2-2' }}</strong></div>
              <div><span>Profundidad Z:</span> <strong>{{ coordThreeZ | number:'1.2-2' }}</strong></div>
              <div><span>Motor Gráfico:</span> <em>Three.js r180 + WebGL</em></div>
            </div>
          </div>

          <!-- Tarjeta 3: Resumen de Prenda Activa -->
          <div class="ar-card active-garment-card">
            <div class="active-garment-badge">Prenda en Visualización</div>
            <h3 class="active-garment-title">{{ prendaSeleccionada().nombre }}</h3>
            <div class="active-garment-meta">
              <span>Categoría: {{ prendaSeleccionada().categoria }}</span>
              <span class="price-tag">Bs. {{ prendaSeleccionada().precio | number:'1.2-2' }}</span>
            </div>
            <button type="button" routerLink="/catalogo" class="ar-btn-buy">
              Ver en el Catálogo y Comprar &rarr;
            </button>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .ar-container {
      min-height: 100vh;
      background: #090d16;
      color: #e2e8f0;
      padding: 1.5rem 2rem;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .ar-header {
      max-width: 1350px;
      margin: 0 auto 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 1rem;
    }

    .ar-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      font-weight: 700;
      color: #818cf8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.25rem;
    }

    .ar-badge-pulse {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 8px #10b981;
    }

    .ar-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0;
    }

    .ar-subtitle {
      font-size: 0.85rem;
      color: #94a3b8;
      margin: 0.25rem 0 0;
    }

    .ar-btn-back {
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
      font-weight: 600;
      background: #1e293b;
      color: #f1f5f9;
      border: 1px solid #334155;
      border-radius: 0.5rem;
      text-decoration: none;
      transition: all 0.2s;
    }
    .ar-btn-back:hover {
      background: #334155;
    }

    .ar-grid {
      max-width: 1350px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1fr 390px;
      gap: 1.5rem;
    }

    @media (max-width: 1024px) {
      .ar-grid {
        grid-template-columns: 1fr;
      }
    }

    .ar-viewport-card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 1rem;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }

    .ar-toolbar {
      background: #131d35;
      border-bottom: 1px solid #1e293b;
      padding: 0.75rem 1rem;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
    }

    .ar-sources {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .ar-label {
      font-size: 0.8rem;
      color: #94a3b8;
      font-weight: 600;
    }

    .ar-pill {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.35rem 0.75rem;
      border-radius: 0.375rem;
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid #334155;
      cursor: pointer;
      transition: all 0.15s;
    }
    .ar-pill:hover {
      background: #334155;
      color: #ffffff;
    }
    .ar-pill.active {
      background: #4f46e5;
      color: #ffffff;
      border-color: #6366f1;
    }
    .ar-pill.active-cam {
      background: #059669;
      color: #ffffff;
      border-color: #10b981;
    }

    .upload-pill {
      cursor: pointer;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      border: 0;
    }

    .ar-toggles {
      display: flex;
      align-items: center;
      gap: 1rem;
      font-size: 0.8rem;
      color: #cbd5e1;
    }

    .ar-toggle {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      cursor: pointer;
    }

    .ar-stage {
      position: relative;
      flex: 1;
      min-height: 520px;
      background: #020617;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .ar-canvas {
      max-width: 100%;
      max-height: 540px;
      object-fit: contain;
      border-radius: 0.5rem;
      display: block;
    }

    .ar-canvas-three {
      position: absolute;
      pointer-events: none;
      z-index: 10;
      object-fit: contain;
      max-width: 100%;
      max-height: 540px;
    }

    .hidden {
      display: none !important;
    }

    .ar-loading-overlay {
      position: absolute;
      inset: 0;
      background: rgba(2, 6, 23, 0.85);
      backdrop-filter: blur(4px);
      z-index: 30;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
    }

    .ar-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #4f46e5;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .ar-loading-text {
      font-size: 0.9rem;
      font-weight: 600;
      color: #f1f5f9;
    }

    .ar-loading-sub {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .ar-status-tag {
      position: absolute;
      top: 1rem;
      left: 1rem;
      background: rgba(136, 19, 55, 0.85);
      border: 1px solid #be123c;
      color: #fecdd3;
      padding: 0.35rem 0.85rem;
      border-radius: 2rem;
      font-size: 0.75rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      backdrop-filter: blur(6px);
      z-index: 20;
    }
    .ar-status-tag.success {
      background: rgba(6, 78, 59, 0.85);
      border-color: #059669;
      color: #a7f3d0;
    }
    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
    }

    /* Carrusel de Prendas */
    .ar-garments-tray {
      background: #090d16;
      border-top: 1px solid #1e293b;
      padding: 0.75rem 1rem;
    }

    .tray-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }

    .garments-list {
      display: flex;
      gap: 0.75rem;
      overflow-x: auto;
      padding-bottom: 0.25rem;
    }

    .garment-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 0.5rem;
      padding: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      cursor: pointer;
      min-width: 210px;
      transition: all 0.2s;
    }
    .garment-card:hover {
      background: #283548;
      border-color: #6366f1;
    }
    .garment-card.selected {
      background: #2e1065;
      border-color: #a855f7;
      box-shadow: 0 0 12px rgba(168, 85, 247, 0.3);
    }

    .garment-thumb-wrap {
      position: relative;
      width: 44px;
      height: 44px;
      background: #0f172a;
      border-radius: 0.375rem;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .garment-thumb {
      max-width: 90%;
      max-height: 90%;
      object-fit: contain;
    }

    .color-dot {
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      border: 1px solid #ffffff;
    }

    .garment-info {
      flex: 1;
      min-width: 0;
    }

    .garment-name {
      font-size: 0.75rem;
      font-weight: 600;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .garment-price {
      font-size: 0.7rem;
      font-weight: 700;
      color: #34d399;
    }

    /* Sidebar */
    .ar-sidebar {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .ar-card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 1rem;
      padding: 1.25rem;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    }

    .ar-card-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 1rem;
    }

    .ar-slider-group {
      margin-bottom: 0.85rem;
    }
    .slider-header {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: #cbd5e1;
      margin-bottom: 0.25rem;
    }
    .slider-header strong {
      color: #818cf8;
    }

    .ar-range {
      width: 100%;
      height: 5px;
      border-radius: 5px;
      background: #1e293b;
      accent-color: #6366f1;
      cursor: pointer;
    }

    .ar-stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .ar-stat-box {
      background: #090d16;
      border: 1px solid #1e293b;
      padding: 0.75rem;
      border-radius: 0.75rem;
    }
    .stat-name {
      font-size: 0.7rem;
      color: #94a3b8;
      font-weight: 600;
      text-transform: uppercase;
    }
    .stat-val {
      font-size: 1.35rem;
      font-weight: 800;
      margin: 0.25rem 0;
    }
    .stat-val.indigo { color: #818cf8; }
    .stat-val.cyan { color: #38bdf8; }
    .stat-val.amber { color: #fbbf24; }
    .stat-val.emerald { color: #34d399; }
    .stat-val .unit {
      font-size: 0.75rem;
      font-weight: 400;
      color: #64748b;
    }
    .stat-detail {
      font-size: 0.65rem;
      color: #64748b;
    }

    .ar-code-box {
      background: #020617;
      border: 1px solid #1e293b;
      padding: 0.75rem;
      border-radius: 0.5rem;
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 0.75rem;
      color: #cbd5e1;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .ar-code-box span { color: #64748b; }
    .ar-code-box strong { color: #34d399; }
    .ar-code-box em { color: #818cf8; font-style: normal; }

    .active-garment-card {
      background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
      border-color: #4f46e5;
    }
    .active-garment-badge {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #a5b4fc;
      margin-bottom: 0.25rem;
    }
    .active-garment-title {
      font-size: 1.1rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 0.5rem;
    }
    .active-garment-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8rem;
      color: #cbd5e1;
      margin-bottom: 1rem;
    }
    .price-tag {
      font-weight: 800;
      color: #34d399;
      font-size: 1rem;
    }
    .ar-btn-buy {
      width: 100%;
      padding: 0.65rem;
      background: #4f46e5;
      color: #ffffff;
      border: none;
      border-radius: 0.5rem;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s;
    }
    .ar-btn-buy:hover {
      background: #4338ca;
    }
  `],
})
export class ProbadorArComponent implements AfterViewInit, OnDestroy {
  @ViewChild('videoElement', { static: true }) videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasOutput', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasThree', { static: true }) canvasThreeRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('imgElement', { static: true }) imgRef!: ElementRef<HTMLImageElement>;
  @ViewChild('stageContainer', { static: true }) stageRef!: ElementRef<HTMLDivElement>;

  modo = signal<'demo1' | 'demo2' | 'webcam' | 'custom'>('demo1');
  cargandoModelo = signal<boolean>(true);
  mostrarEsqueleto = signal<boolean>(false);
  mostrarLandmarks = signal<boolean>(false);
  mostrarRopa3D = signal<boolean>(true);

  // Calibración manual
  escalaManual = signal<number>(1.05);
  offsetVertical = signal<number>(0);
  opacidadTela = signal<number>(0.95);

  // Catálogo de Prendas para Probar
  catalogoPrendas: Prenda3D[] = [
    {
      id: 180,
      nombre: 'Suéter Tejido Urbano Marrón',
      categoria: 'Abrigos & Sweaters',
      colorHex: '#8B4513',
      tipoMalla: 'sueter',
      precio: 249.0,
      fotoUrl: 'https://pngimg.com/uploads/sweater/sweater_PNG83.png',
    },
    {
      id: 182,
      nombre: 'Abrigo Largo Elegante Camel',
      categoria: 'Abrigos & Sweaters',
      colorHex: '#C19A6B',
      tipoMalla: 'chaqueta',
      precio: 389.0,
      fotoUrl: 'https://pngimg.com/uploads/sweater/sweater_PNG80.png',
    },
    {
      id: 178,
      nombre: 'Vestido Gala Elegante Noche',
      categoria: 'Vestidos',
      colorHex: '#1e1b4b',
      tipoMalla: 'vestido',
      precio: 449.0,
      fotoUrl: 'https://pngimg.com/uploads/dress/dress_PNG196.png',
    },
    {
      id: 101,
      nombre: 'Polera Deportiva Performance',
      categoria: 'Poleras',
      colorHex: '#0284c7',
      tipoMalla: 'polera',
      precio: 149.0,
      fotoUrl: 'https://pngimg.com/uploads/running_shoes/running_shoes_PNG5821.png',
    },
  ];

  prendaSeleccionada = signal<Prenda3D>(this.catalogoPrendas[0]);

  metricas = signal<MetricasCuerpo>({
    detectado: false,
    confianza: 0,
    anchoHombrosPx: 0,
    altoTorsoPx: 0,
    inclinacionGrados: 0,
    centroPechoX: 0,
    centroPechoY: 0,
    tallaSugerida: '—',
  });

  coordThreeX = 0;
  coordThreeY = 0;
  coordThreeZ = 0;

  // MediaPipe
  private poseLandmarker: PoseLandmarker | null = null;
  private animFrameId: number | null = null;
  private mediaStream: MediaStream | null = null;

  // Three.js Engine
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private meshPrendaGroup = new THREE.Group();
  private texturaPrendaLoader = new THREE.TextureLoader();
  private materialPrenda!: THREE.MeshStandardMaterial;

  private readonly IMAGEN_DEMO_1 = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80';
  private readonly IMAGEN_DEMO_2 = 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&auto=format&fit=crop&q=80';

  async ngAfterViewInit(): Promise<void> {
    this.inicializarThreeJS();
    await this.inicializarMediaPipe();
    this.cargarPrendaEnEscena(this.prendaSeleccionada());
    this.cargarImagenDemo(this.IMAGEN_DEMO_1);
  }

  ngOnDestroy(): void {
    this.detenerCamara();
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.poseLandmarker?.close();
    this.renderer?.dispose();
  }

  // =========================================================================
  // MOTOR THREE.JS (ESCENA 3D Y MALLA TEXTIL)
  // =========================================================================
  private inicializarThreeJS(): void {
    const canvas = this.canvasThreeRef.nativeElement;
    const w = 600;
    const h = 800;

    this.scene = new THREE.Scene();

    // Cámara con FOV adecuado para tracking de torso
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    this.camera.position.set(0, 0, 10);

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true, // Fondo transparente
      antialias: true,
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Iluminación de estudio
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
    hemiLight.position.set(0, 20, 0);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 7.5);
    this.scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0x818cf8, 0.8);
    backLight.position.set(-5, -5, -5);
    this.scene.add(backLight);

    // Grupo contenedor de la prenda
    this.scene.add(this.meshPrendaGroup);
  }

  private cargarPrendaEnEscena(prenda: Prenda3D): void {
    // Limpiar malla anterior
    while (this.meshPrendaGroup.children.length > 0) {
      const obj = this.meshPrendaGroup.children[0];
      this.meshPrendaGroup.remove(obj);
    }

    // Material de tela con sombreado PBR
    this.materialPrenda = new THREE.MeshStandardMaterial({
      color: new THREE.Color(prenda.colorHex),
      roughness: 0.7,
      metalness: 0.1,
      transparent: true,
      opacity: this.opacidadTela(),
      side: THREE.DoubleSide,
    });

    // Cargar textura real de la prenda desde el catálogo
    this.texturaPrendaLoader.load(
      prenda.fotoUrl,
      (textura) => {
        textura.colorSpace = THREE.SRGBColorSpace;
        this.materialPrenda.map = textura;
        this.materialPrenda.needsUpdate = true;
      },
      undefined,
      (err) => console.warn('Textura no disponible, usando sombreado plano:', err)
    );

    // Construcción de la geometría 3D textil según el tipo de prenda
    const groupPrenda = new THREE.Group();

    if (prenda.tipoMalla === 'chaqueta' || prenda.tipoMalla === 'sueter') {
      // Torso principal
      const torsoGeo = new THREE.CylinderGeometry(1.05, 0.95, 2.2, 32, 1, true);
      const torsoMesh = new THREE.Mesh(torsoGeo, this.materialPrenda);
      torsoMesh.position.y = -0.3;
      groupPrenda.add(torsoMesh);

      // Hombros / Cuello
      const cuelloGeo = new THREE.TorusGeometry(0.7, 0.25, 16, 32, Math.PI);
      const cuelloMesh = new THREE.Mesh(cuelloGeo, this.materialPrenda);
      cuelloMesh.rotation.x = Math.PI / 2;
      cuelloMesh.position.y = 0.8;
      groupPrenda.add(cuelloMesh);

      // Manga Izquierda
      const mangaIzqGeo = new THREE.CylinderGeometry(0.35, 0.28, 1.6, 16);
      const mangaIzq = new THREE.Mesh(mangaIzqGeo, this.materialPrenda);
      mangaIzq.position.set(1.15, 0.2, 0);
      mangaIzq.rotation.z = -Math.PI / 5;
      groupPrenda.add(mangaIzq);

      // Manga Derecha
      const mangaDerGeo = new THREE.CylinderGeometry(0.35, 0.28, 1.6, 16);
      const mangaDer = new THREE.Mesh(mangaDerGeo, this.materialPrenda);
      mangaDer.position.set(-1.15, 0.2, 0);
      mangaDer.rotation.z = Math.PI / 5;
      groupPrenda.add(mangaDer);
    } else if (prenda.tipoMalla === 'vestido') {
      // Torso ajustado
      const torsoGeo = new THREE.CylinderGeometry(0.9, 0.75, 1.8, 32);
      const torsoMesh = new THREE.Mesh(torsoGeo, this.materialPrenda);
      torsoMesh.position.y = 0.1;
      groupPrenda.add(torsoMesh);

      // Falda con caída ancha
      const faldaGeo = new THREE.ConeGeometry(1.6, 2.6, 32, 1, true);
      const faldaMesh = new THREE.Mesh(faldaGeo, this.materialPrenda);
      faldaMesh.position.y = -1.8;
      groupPrenda.add(faldaMesh);
    } else {
      // Polera clásica
      const poleraGeo = new THREE.CylinderGeometry(1.0, 0.95, 1.9, 32);
      const poleraMesh = new THREE.Mesh(poleraGeo, this.materialPrenda);
      poleraMesh.position.y = -0.2;
      groupPrenda.add(poleraMesh);

      const mIzq = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.32, 0.7, 16), this.materialPrenda);
      mIzq.position.set(1.0, 0.5, 0);
      mIzq.rotation.z = -Math.PI / 4;
      groupPrenda.add(mIzq);

      const mDer = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.32, 0.7, 16), this.materialPrenda);
      mDer.position.set(-1.0, 0.5, 0);
      mDer.rotation.z = Math.PI / 4;
      groupPrenda.add(mDer);
    }

    this.meshPrendaGroup.add(groupPrenda);
    this.renderer.render(this.scene, this.camera);
  }

  // =========================================================================
  // MOTOR MEDIAPIPE & SINCRONIZACIÓN CINEMÁTICA 3D
  // =========================================================================
  async inicializarMediaPipe(): Promise<void> {
    try {
      this.cargandoModelo.set(true);
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'IMAGE',
        numPoses: 1,
      });

      this.cargandoModelo.set(false);
    } catch (err) {
      console.warn('Fallback a CPU en MediaPipe:', err);
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
            delegate: 'CPU',
          },
          runningMode: 'IMAGE',
          numPoses: 1,
        });
        this.cargandoModelo.set(false);
      } catch (fallbackErr) {
        console.error('Error cargando MediaPipe:', fallbackErr);
        this.cargandoModelo.set(false);
      }
    }
  }

  seleccionarModo(nuevoModo: 'demo1' | 'demo2' | 'webcam'): void {
    this.modo.set(nuevoModo);
    this.detenerCamara();

    if (nuevoModo === 'demo1') {
      this.cargarImagenDemo(this.IMAGEN_DEMO_1);
    } else if (nuevoModo === 'demo2') {
      this.cargarImagenDemo(this.IMAGEN_DEMO_2);
    } else if (nuevoModo === 'webcam') {
      this.iniciarCamara();
    }
  }

  seleccionarPrenda(prenda: Prenda3D): void {
    this.prendaSeleccionada.set(prenda);
    this.cargarPrendaEnEscena(prenda);
    this.reprocesarActual();
  }

  cargarImagenDemo(url: string): void {
    const img = this.imgRef.nativeElement;
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      this.procesarImagenEstatica(img);
    };
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.modo.set('custom');
        this.detenerCamara();
        const img = this.imgRef.nativeElement;
        img.src = e.target?.result as string;
        img.onload = () => {
          this.procesarImagenEstatica(img);
        };
      };
      reader.readAsDataURL(file);
    }
  }

  async iniciarCamara(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });

      const video = this.videoRef.nativeElement;
      video.srcObject = this.mediaStream;
      video.onloadeddata = () => {
        video.play();
        this.configurarModoVideo();
      };
    } catch (err) {
      console.warn('No se pudo acceder a la cámara web:', err);
      alert('No se detectó cámara web activa. Puedes usar las imágenes de demostración o subir una foto.');
      this.seleccionarModo('demo1');
    }
  }

  detenerCamara(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private async configurarModoVideo(): Promise<void> {
    if (!this.poseLandmarker) return;
    await this.poseLandmarker.setOptions({ runningMode: 'VIDEO' });
    this.bucleVideo();
  }

  private bucleVideo = (): void => {
    const video = this.videoRef?.nativeElement;
    const canvas = this.canvasRef?.nativeElement;
    const canvasThree = this.canvasThreeRef?.nativeElement;
    if (!video || !canvas || !canvasThree || video.paused || video.ended || !this.poseLandmarker) return;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvasThree.width = video.videoWidth;
      canvasThree.height = video.videoHeight;
      this.ajustarDimensionesThree(video.videoWidth, video.videoHeight);
    }

    const startTimeMs = performance.now();
    const result = this.poseLandmarker.detectForVideo(video, startTimeMs);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      this.renderizarTrackingY3D(ctx, result, canvas.width, canvas.height);
    }

    this.animFrameId = requestAnimationFrame(this.bucleVideo);
  };

  private async procesarImagenEstatica(img: HTMLImageElement): Promise<void> {
    if (!this.poseLandmarker) return;
    await this.poseLandmarker.setOptions({ runningMode: 'IMAGE' });

    const canvas = this.canvasRef.nativeElement;
    const canvasThree = this.canvasThreeRef.nativeElement;
    const w = img.naturalWidth || 600;
    const h = img.naturalHeight || 800;

    canvas.width = w;
    canvas.height = h;
    canvasThree.width = w;
    canvasThree.height = h;
    this.ajustarDimensionesThree(w, h);

    const result = this.poseLandmarker.detect(img);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, w, h);
      this.renderizarTrackingY3D(ctx, result, w, h);
    }
  }

  private ajustarDimensionesThree(w: number, h: number): void {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  // =========================================================================
  // VINCULACIÓN CINEMÁTICA Y DEFORMACIÓN 3D
  // =========================================================================
  private renderizarTrackingY3D(
    ctx: CanvasRenderingContext2D,
    result: PoseLandmarkerResult,
    w: number,
    h: number
  ): void {
    if (!result.landmarks || result.landmarks.length === 0) {
      this.metricas.update((m) => ({ ...m, detectado: false, confianza: 0 }));
      this.meshPrendaGroup.visible = false;
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const landmarks = result.landmarks[0];
    this.meshPrendaGroup.visible = true;

    // Puntos anatómicos principales
    const hombroIzq = landmarks[11];
    const hombroDer = landmarks[12];
    const caderaIzq = landmarks[23];
    const caderaDer = landmarks[24];

    const hIzqX = hombroIzq.x * w;
    const hIzqY = hombroIzq.y * h;
    const hDerX = hombroDer.x * w;
    const hDerY = hombroDer.y * h;

    const cIzqX = caderaIzq.x * w;
    const cIzqY = caderaIzq.y * h;
    const cDerX = caderaDer.x * w;
    const cDerY = caderaDer.y * h;

    // Métricas en píxeles
    const anchoHombros = Math.hypot(hDerX - hIzqX, hDerY - hIzqY);
    const centroHombrosX = (hIzqX + hDerX) / 2;
    const centroHombrosY = (hIzqY + hDerY) / 2;
    const centroCaderasX = (cIzqX + cDerX) / 2;
    const centroCaderasY = (cIzqY + cDerY) / 2;
    const altoTorso = Math.hypot(centroCaderasX - centroHombrosX, centroCaderasY - centroHombrosY);

    // Ángulos
    const anguloRadianes = Math.atan2(hDerY - hIzqY, hDerX - hIzqX);
    const anguloGrados = (anguloRadianes * 180) / Math.PI;

    // Punto central de anclaje (pecho)
    const centroPechoX = (centroHombrosX * 2 + centroCaderasX) / 3;
    const centroPechoY = (centroHombrosY * 2 + centroCaderasY) / 3 + this.offsetVertical();

    // Estimación heurística de talla
    let talla = 'M';
    if (anchoHombros < w * 0.22) talla = 'S';
    else if (anchoHombros > w * 0.35) talla = 'XL';
    else if (anchoHombros > w * 0.28) talla = 'L';

    this.metricas.set({
      detectado: true,
      confianza: ((hombroIzq.visibility || 0.9) + (hombroDer.visibility || 0.9)) / 2,
      anchoHombrosPx: anchoHombros,
      altoTorsoPx: altoTorso,
      inclinacionGrados: anguloGrados,
      centroPechoX: centroPechoX,
      centroPechoY: centroPechoY,
      tallaSugerida: talla,
    });

    // -----------------------------------------------------------------------
    // CINEMÁTICA 3D: MAPEO DE PANTALLA A ESPACIO THREE.JS
    // -----------------------------------------------------------------------
    // Calcular altura y ancho del plano visible a Z = 0 con FOV 45
    const distCam = this.camera.position.z; // 10
    const vFOV = (this.camera.fov * Math.PI) / 180;
    const planeHeight = 2 * Math.tan(vFOV / 2) * distCam;
    const planeWidth = planeHeight * this.camera.aspect;

    // Coordenadas mundiales normalizadas
    const normX = centroPechoX / w;
    const normY = centroPechoY / h;

    this.coordThreeX = (normX - 0.5) * planeWidth;
    this.coordThreeY = -(normY - 0.5) * planeHeight;
    this.coordThreeZ = 0;

    // 1. Posición
    this.meshPrendaGroup.position.set(this.coordThreeX, this.coordThreeY, this.coordThreeZ);

    // 2. Escala (Proporcional a la distancia de hombros)
    const escalaBase = (anchoHombros / w) * (planeWidth / 2.2) * this.escalaManual();
    this.meshPrendaGroup.scale.set(escalaBase, escalaBase, escalaBase);

    // 3. Rotaciones (Roll en Z, Yaw en Y, Pitch en X)
    // Roll: Inclinación lateral
    this.meshPrendaGroup.rotation.z = -anguloRadianes;

    // Yaw: Giro de hombros hacia adelante/atrás usando la profundidad Z de MediaPipe
    const zDiff = (hombroDer.z - hombroIzq.z) * 2.5;
    this.meshPrendaGroup.rotation.y = THREE.MathUtils.clamp(zDiff, -0.6, 0.6);

    // Renderizar escena Three.js
    this.renderer.render(this.scene, this.camera);

    // -----------------------------------------------------------------------
    // OVERLAYS 2D OPCIONALES (ESQUELETO Y LANDMARKS)
    // -----------------------------------------------------------------------
    if (this.mostrarEsqueleto()) {
      ctx.save();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
      ctx.lineWidth = 2.5;
      const conexiones = [
        [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
        [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]
      ];
      for (const [i, j] of conexiones) {
        const p1 = landmarks[i];
        const p2 = landmarks[j];
        if (p1 && p2 && (p1.visibility ?? 1) > 0.4 && (p2.visibility ?? 1) > 0.4) {
          ctx.beginPath();
          ctx.moveTo(p1.x * w, p1.y * h);
          ctx.lineTo(p2.x * w, p2.y * h);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    if (this.mostrarLandmarks()) {
      ctx.save();
      for (let i = 0; i < landmarks.length; i++) {
        const pt = landmarks[i];
        if ((pt.visibility ?? 1) > 0.4) {
          ctx.beginPath();
          ctx.arc(pt.x * w, pt.y * h, i === 11 || i === 12 ? 5 : 3, 0, 2 * Math.PI);
          ctx.fillStyle = i === 11 || i === 12 ? '#f43f5e' : '#38bdf8';
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  // Controles Manuales
  cambiarEscalaManual(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.escalaManual.set(val);
    this.reprocesarActual();
  }

  cambiarOffsetVertical(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.offsetVertical.set(val);
    this.reprocesarActual();
  }

  cambiarOpacidad(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.opacidadTela.set(val);
    if (this.materialPrenda) {
      this.materialPrenda.opacity = val;
    }
    this.reprocesarActual();
  }

  toggleEsqueleto(): void {
    this.mostrarEsqueleto.update((v) => !v);
    this.reprocesarActual();
  }

  toggleLandmarks(): void {
    this.mostrarLandmarks.update((v) => !v);
    this.reprocesarActual();
  }

  toggleRopa3D(): void {
    this.mostrarRopa3D.update((v) => !v);
    this.reprocesarActual();
  }

  private reprocesarActual(): void {
    if (this.modo() !== 'webcam') {
      const img = this.imgRef?.nativeElement;
      if (img && img.complete) {
        this.procesarImagenEstatica(img);
      }
    }
  }
}
