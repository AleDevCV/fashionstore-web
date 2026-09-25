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
import { environment } from '../../../environments/environment';
import { bootstrapCameraKit, CameraKit, CameraKitSession } from '@snap/camera-kit';

@Component({
  selector: 'app-probador-ar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="ar-container">
      <header class="ar-header">
        <div>
          <div class="ar-badge">
            <span class="ar-badge-pulse"></span>
            Snapchat Camera Kit (Vestidor Virtual AR)
          </div>
          <h1 class="ar-title">Vestidor Virtual AR &middot; FashionStore</h1>
          <p class="ar-subtitle">
            TecnologÃ­a de Realidad Aumentada impulsada por Snap Camera Kit
          </p>
        </div>
        <div class="ar-actions">
          <a routerLink="/catalogo" class="ar-btn-back">
            &larr; Volver al CatÃ¡logo
          </a>
        </div>
      </header>

      <div class="ar-grid">
        <div class="ar-viewport-card">
          <div class="ar-viewport-container" #canvasContainer>
             <div *ngIf="cargando()" class="loading-overlay">
               <div class="spinner"></div>
               <p>{{ loadingMensaje() }}</p>
             </div>
             <!-- Camera Kit inyectarÃ¡ el <canvas> aquÃ­ adentro -->
          </div>
        </div>

        <div class="ar-sidebar">
          <h2>Panel de Control</h2>
          <div class="control-panel">
            <p>Lens ID actual: <strong>{{ environment.snapCameraKit.testLensId || 'No configurado' }}</strong></p>
            <p>Group ID actual: <strong>{{ environment.snapCameraKit.lensGroupId || 'No configurado' }}</strong></p>

            <button 
              class="ar-btn-primary" 
              (click)="cargarLente()" 
              [disabled]="!environment.snapCameraKit.testLensId || !environment.snapCameraKit.lensGroupId">
              Aplicar Ropa 3D
            </button>
            <button class="ar-btn-secondary" (click)="quitarLente()">Quitar Ropa</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ar-container { padding: 20px; font-family: sans-serif; }
    .ar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .ar-badge { display: inline-flex; align-items: center; background: #000; color: #fffc00; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-bottom: 8px;}
    .ar-badge-pulse { width: 8px; height: 8px; background: #fffc00; border-radius: 50%; margin-right: 6px; animation: pulse 1.5s infinite; }
    .ar-title { margin: 0; font-size: 24px; color: #333; }
    .ar-subtitle { margin: 4px 0 0; font-size: 14px; color: #666; }
    .ar-actions a { text-decoration: none; color: #fff; background: #333; padding: 10px 16px; border-radius: 6px; font-weight: bold;}
    .ar-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
    .ar-viewport-card { background: #000; border-radius: 12px; overflow: hidden; min-height: 600px; display: flex; align-items: center; justify-content: center; position: relative; }
    .ar-viewport-container { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }
    .ar-viewport-container canvas { width: 100%; height: 100%; object-fit: cover; }
    .loading-overlay { position: absolute; z-index: 10; color: white; display: flex; flex-direction: column; align-items: center; }
    .spinner { border: 4px solid rgba(255, 255, 255, 0.3); border-top: 4px solid #fffc00; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 10px;}
    .ar-sidebar { background: #f9f9f9; padding: 20px; border-radius: 12px; border: 1px solid #ddd; }
    .control-panel button { width: 100%; padding: 12px; margin-bottom: 10px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; }
    .ar-btn-primary { background: #fffc00; color: #000; }
    .ar-btn-primary:disabled { background: #ccc; cursor: not-allowed; }
    .ar-btn-secondary { background: #333; color: #fff; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.5; } 100% { transform: scale(1); opacity: 1; } }
  `]
})
export class ProbadorArComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasContainer', { static: true }) canvasContainer!: ElementRef<HTMLDivElement>;

  environment = environment;
  cargando = signal<boolean>(true);
  loadingMensaje = signal<string>('Iniciando Snap Camera Kit...');

  private cameraKit: CameraKit | null = null;
  private session: CameraKitSession | null = null;
  private source: MediaStream | null = null;

  async ngAfterViewInit() {
    try {
      // 1. Inicializar Camera Kit con el API Token pÃºblico
      this.cameraKit = await bootstrapCameraKit({
        apiToken: environment.snapCameraKit.apiToken
      });

      // 2. Crear SesiÃ³n
      this.session = await this.cameraKit.createSession();

      // 3. Inyectar el canvas de salida en el DOM
      this.canvasContainer.nativeElement.appendChild(this.session.output.live);

      // 4. Solicitar permiso de cÃ¡mara al usuario
      this.loadingMensaje.set('Solicitando acceso a la cÃ¡mara...');
      const userMediaSource = await this.cameraKit.getUserMediaSource();
      await this.session.setSource(userMediaSource);
      
      // 5. Iniciar la cÃ¡mara
      await this.session.play();
      this.cargando.set(false);

      // Si tenemos configurados los IDs desde el entorno, cargamos de inmediato
      if (environment.snapCameraKit.testLensId && environment.snapCameraKit.lensGroupId) {
        this.cargarLente();
      }

    } catch (error) {
      console.error('Error inicializando Camera Kit:', error);
      this.loadingMensaje.set('Error al acceder a la cÃ¡mara o inicializar el SDK.');
    }
  }

  async cargarLente() {
    if (!this.cameraKit || !this.session) return;
    const { testLensId, lensGroupId } = environment.snapCameraKit;
    if (!testLensId || !lensGroupId) return;

    try {
      this.cargando.set(true);
      this.loadingMensaje.set('Descargando ropa 3D (Lens)...');
      
      const lens = await this.cameraKit.lensRepository.loadLens(testLensId, lensGroupId);
      await this.session.applyLens(lens);
      
      this.cargando.set(false);
    } catch (error) {
      console.error('Error cargando el lente:', error);
      this.loadingMensaje.set('Error al descargar la ropa. Verifique el Group ID.');
    }
  }

  async quitarLente() {
    if (this.session) {
      await this.session.removeLens();
    }
  }

  ngOnDestroy() {
    if (this.session) {
      this.session.pause();
    }
  }
}
