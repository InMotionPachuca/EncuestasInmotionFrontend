import { Component, OnInit } from '@angular/core';
import { EncuestaService } from '../../services/encuesta.service';
import { Encuesta } from '../../models/encuesta.model';

@Component({
  selector: 'app-dashboard-facturacion',
  templateUrl: './dashboard-facturacion.component.html',
  styleUrls: ['./dashboard-facturacion.component.css']
})
export class DashboardFacturacionComponent implements OnInit {
  registros: Encuesta[] = [];
  registrosFiltrados: Encuesta[] = [];
  marcas: any[] = [];
  loading: boolean = true;

  filtroSucursal: string = '';
  filtroTipo: string = '';
  busquedaTexto: string = '';

  totalFacturados: number = 0;
  totalVentas: number = 0;
  totalPostventas: number = 0;
  totalUnidades: number = 0;

  constructor(private encuestaService: EncuestaService) {}

  ngOnInit(): void {
    this.marcas = this.encuestaService.obtenerMarcas();
    this.cargarRegistros();
  }

  cargarRegistros(): void {
    this.loading = true;
    this.encuestaService.listarEncuestas().subscribe({
      next: (data: Encuesta[]) => {
        // Excluir registros generados por la encuesta de clima laboral
        this.registros = (data || []).filter(e => 
          e.tipo !== 'CLIMA_LABORAL' && 
          e.serie !== 'CLIMA-LABORAL-2026' &&
          e.tipo !== 'CLIMA'
        );
        this.aplicarFiltros();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar facturación:', err);
        this.loading = false;
      }
    });
  }

  aplicarFiltros(): void {
    this.registrosFiltrados = this.registros.filter(r => {
      const matchSucursal = !this.filtroSucursal || r.marcaId?.toString() === this.filtroSucursal;
      const matchTipo = !this.filtroTipo || r.tipo === this.filtroTipo;
      
      let matchTexto = true;
      if (this.busquedaTexto.trim()) {
        const query = this.busquedaTexto.toLowerCase();
        const cliente = (r.clienteNombre || '').toLowerCase();
        const asesor = (r.asesor || '').toLowerCase();
        const unidad = (r.unidad || '').toLowerCase();
        const tel = (r.telefono || r.clienteTelefono || '').toLowerCase();
        matchTexto = cliente.includes(query) || asesor.includes(query) || unidad.includes(query) || tel.includes(query);
      }

      return matchSucursal && matchTipo && matchTexto;
    });

    this.totalFacturados = this.registrosFiltrados.length;
    this.totalVentas = this.registrosFiltrados.filter(r => r.tipo === 'VENTA').length;
    this.totalPostventas = this.registrosFiltrados.filter(r => r.tipo === 'POSTVENTA' || r.tipo === 'SERVICIO').length;
    this.totalUnidades = this.registrosFiltrados.filter(r => !!r.unidad).length;
  }
}