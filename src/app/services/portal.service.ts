import { Injectable, ComponentRef, Type, Injector, ApplicationRef, EmbeddedViewRef, ComponentFactoryResolver } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PortalService {
  constructor(
    private appRef: ApplicationRef,
    private injector: Injector,
    private componentFactoryResolver: ComponentFactoryResolver
  ) {}

  createComponent<T>(component: Type<T>): ComponentRef<T> {
    // Component factory oluştur
    const componentFactory = this.componentFactoryResolver.resolveComponentFactory(component);
    
    // Bileşeni oluştur
    const componentRef = componentFactory.create(this.injector);
    
    // Bileşeni application'a ekle
    this.appRef.attachView(componentRef.hostView);
    
    // DOM elementini al
    const domElem = (componentRef.hostView as EmbeddedViewRef<any>).rootNodes[0];
    
    // Body'ye append et
    document.body.appendChild(domElem);
    
    return componentRef;
  }

  destroyComponent<T>(componentRef: ComponentRef<T>): void {
    if (componentRef) {
      // DOM elementini kaldır
      const domElem = (componentRef.hostView as EmbeddedViewRef<any>).rootNodes[0];
      if (domElem && domElem.parentNode) {
        domElem.parentNode.removeChild(domElem);
      }
      
      // View'ı detach et
      this.appRef.detachView(componentRef.hostView);
      
      // Bileşeni destroy et
      componentRef.destroy();
    }
  }
} 