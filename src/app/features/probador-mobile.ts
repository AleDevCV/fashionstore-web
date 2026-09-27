import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PrendaCatalogo } from '../core/models/catalogo.model';
import { CatalogoService } from '../core/services/catalogo.service';
import { ProbadorIa } from './catalogo/probador-ia/probador-ia';

@Component({
  selector: 'app-probador-mobile',
  standalone: true,
  imports: [CommonModule, ProbadorIa],
  templateUrl: './probador-mobile.html'
})
export class ProbadorMobile implements OnInit {
  private route = inject(ActivatedRoute);
  private catalogoService = inject(CatalogoService);

  readonly prenda = signal<PrendaCatalogo | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.catalogoService.obtenerFicha(Number(id)).subscribe({
        next: (p: any) => {
          if (p.prenda) {
            this.prenda.set(p.prenda);
          } else {
            this.prenda.set(p);
          }
        },
        error: () => this.error.set('No se pudo cargar la prenda.')
      });
    } else {
      this.error.set('No se proporcionó ID de prenda.');
    }
  }

  onCerrado() {
    if ((window as any).flutter_inappwebview) {
      (window as any).flutter_inappwebview.callHandler('cerrarProbador');
    }
  }
}


