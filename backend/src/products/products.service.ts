import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  // constructor(@InjectRepository(Product) private productRepository: Repository<Product>) { }

  create(createProductDto: CreateProductDto) {
    // return this.productRepository.save(createProductDto);
  }

  async findAll() {
    // return await this.productRepository.find();
    return [];
  }

  async findOne(id: number) {
    // return await this.productRepository.findOne({
    //   where: { id: id }
    // });
  }

  update(id: number, updateProductDto: UpdateProductDto) {
    // this.productRepository.save(updateProductDto);
  }

  remove(id: number) {
    // this.productRepository.delete(id);
  }
}
