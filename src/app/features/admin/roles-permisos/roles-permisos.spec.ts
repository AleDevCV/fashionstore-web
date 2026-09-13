/**
 * =============================================================================
 * PRUEBAS DE LA MATRIZ DE ROLES Y PERMISOS (CU03)
 * =============================================================================
 */

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { RolesPermisos } from './roles-permisos';
import { PermisoService } from '../../../core/services/permiso.service';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { Permiso } from '../../../core/models/permiso.model';
import { Rol } from '../../../core/models/usuario.model';

describe('RolesPermisos (CU03)', () => {
  let fixture: ComponentFixture<RolesPermisos>;
  let componente: RolesPermisos;
  let permisoSpy: jasmine.SpyObj<PermisoService>;
  let notificacionSpy: jasmine.SpyObj<NotificacionService>;

  const mockRoles: Rol[] = [
    { id_rol: 1, nombre: 'Administrador', descripcion: 'Acceso total' },
    { id_rol: 2, nombre: 'Encargado de Sucursal', descripcion: 'Gestión local' },
  ];

  const mockPermisos: Permiso[] = [
    {
      id_permiso: 10,
      nombre: 'Ver usuarios',
      codigo: 'usuarios.ver',
      modulo: 'Usuarios',
      descripcion: 'Permite consultar lista',
    },
    {
      id_permiso: 20,
      nombre: 'Crear productos',
      codigo: 'prendas.crear',
      modulo: 'Catálogo',
      descripcion: 'Permite crear prendas',
    },
  ];

  beforeEach(async () => {
    permisoSpy = jasmine.createSpyObj<PermisoService>('PermisoService', [
      'listarRoles',
      'listarPermisos',
      'obtenerPermisosRol',
      'actualizarPermisosRol',
    ]);

    notificacionSpy = jasmine.createSpyObj<NotificacionService>('NotificacionService', [
      'exito',
      'error',
      'aviso',
    ]);

    permisoSpy.listarRoles.and.returnValue(of(mockRoles));
    permisoSpy.listarPermisos.and.returnValue(of(mockPermisos));
    permisoSpy.obtenerPermisosRol.and.callFake((idRol) => {
      if (idRol === 1) {
        return of({ id_rol: 1, rol: 'Administrador', permisos: [10, 20] });
      }
      return of({ id_rol: 2, rol: 'Encargado de Sucursal', permisos: [20] });
    });

    await TestBed.configureTestingModule({
      imports: [RolesPermisos],
      providers: [
        { provide: PermisoService, useValue: permisoSpy },
        { provide: NotificacionService, useValue: notificacionSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RolesPermisos);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('inicializa y carga los roles, permisos y asignaciones', () => {
    expect(permisoSpy.listarRoles).toHaveBeenCalled();
    expect(permisoSpy.listarPermisos).toHaveBeenCalled();
    expect(permisoSpy.obtenerPermisosRol).toHaveBeenCalledWith(1);
    expect(permisoSpy.obtenerPermisosRol).toHaveBeenCalledWith(2);

    expect(componente.roles().length).toBe(2);
    expect(componente.permisos().length).toBe(2);
    expect(componente.cargando()).toBeFalse();
  });

  it('agrupa los permisos por módulo correctamente', () => {
    const grupos = componente.gruposPorModulo();
    expect(grupos.length).toBe(2);
    expect(grupos.some((g) => g.nombre === 'Usuarios')).toBeTrue();
    expect(grupos.some((g) => g.nombre === 'Catálogo')).toBeTrue();
  });

  it('identifica que el rol Administrador tiene todos los permisos activos y bloqueados', () => {
    const adminRol = mockRoles[0];
    expect(componente.tienePermiso(adminRol.id_rol, 10)).toBeTrue();
    expect(componente.tienePermiso(adminRol.id_rol, 20)).toBeTrue();
    expect(componente.esRolBloqueado(adminRol)).toBeTrue();
  });

  it('filtra los permisos por término de búsqueda y por módulo', () => {
    componente.busqueda.set('usuarios');
    expect(componente.permisosFiltrados().length).toBe(1);
    expect(componente.permisosFiltrados()[0].codigo).toBe('usuarios.ver');

    componente.busqueda.set('');
    componente.seleccionarModulo('Catálogo');
    expect(componente.permisosFiltrados().length).toBe(1);
    expect(componente.permisosFiltrados()[0].modulo).toBe('Catálogo');
  });

  it('asigna un nuevo permiso y envía la sincronización reactiva al backend', () => {
    const encargado = mockRoles[1];
    const permiso = mockPermisos[0]; // id_permiso: 10, aún no asignado al encargado

    permisoSpy.actualizarPermisosRol.and.returnValue(
      of({ mensaje: 'Actualizado', id_rol: 2, total_permisos: 2 }),
    );

    componente.alternarPermiso(encargado, permiso);

    expect(permisoSpy.actualizarPermisosRol).toHaveBeenCalledWith(2, [20, 10]);
    expect(notificacionSpy.exito).toHaveBeenCalled();
    expect(componente.tienePermiso(2, 10)).toBeTrue();
  });

  it('revierte la asignación si el backend responde con error', () => {
    const encargado = mockRoles[1];
    const permiso = mockPermisos[1]; // id_permiso: 20, ya asignado

    permisoSpy.actualizarPermisosRol.and.returnValue(
      throwError(() => new Error('Error al sincronizar permisos')),
    );

    componente.alternarPermiso(encargado, permiso);

    expect(notificacionSpy.error).toHaveBeenCalled();
    // Vuelve a estar presente tras la reversión
    expect(componente.tienePermiso(2, 20)).toBeTrue();
  });

  it('no permite alternar permisos para el rol Administrador', () => {
    const admin = mockRoles[0];
    const permiso = mockPermisos[0];

    componente.alternarPermiso(admin, permiso);
    expect(permisoSpy.actualizarPermisosRol).not.toHaveBeenCalled();
  });
});
